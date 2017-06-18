/********************************************** NOTE **********************************************/
/* All commands are Unix native as their are faster than loading and processing the files in node */
/**************************************************************************************************/

var fs = require("fs");
var path = require("path");
var zlib = require("zlib");
var readline = require("readline");
const { spawn } = require("child_process");

var { https } = require("follow-redirects");
var co = require("co");
var FastDownload = require("fast-download");

// Credentials file
var credentials = require("./credentials.json");

// Satori.com publish keys
var roleSecretKey = credentials.satori.secret;
var appkey = credentials.satori.key;

var endpoint = "wss://open-data.api.satori.com";
var role = "domains";
var channel = "domains";

var roleSecretProvider = RTM.roleSecretAuthProvider(role, roleSecretKey);

var rtm = new RTM(endpoint, appkey, {
    authProvider: roleSecretProvider,
});

var subscription = rtm.subscribe(channel, RTM.SubscriptionMode.SIMPLE);

var subscribed = false;
subscription.on("enter-subscribed", function() {
    if (!subscribed) {
        subscribed = true;
        start();
    }
});

rtm.start();

// Global vars
// RegExp to extract the zone name from header reply
var fileReg = new RegExp("^(\\d{8})\\-([a-z\\-0-9]+)\\-zone\\-data\\.txt\\.gz");

// Temp file name
var tempName = "temp.txt.gz";

// Registers to check
var registers = ["soa", "ns", "a", "aaaa", "cname", "mx", "ptr"];

// Using the registers, create a command line to filter them from the zonefile
var awkarray = [];
for (var i = 0; i < registers.length; i++) {
    awkarray.push('$4 == "' + registers[i] + '"');
}
var unzippipe = "gunzip -c " + tempName + " | awk '" + awkarray.join(" || ") + " {print $1, $4, $5}' | sort --parallel=1 -k1,1 -k2,2 -k3,3 | tee zones/[ZONE].dns.txt2 | awk '{print $1}' | sort --parallel=1 -uo zones/[ZONE].domains.txt2";

// Working folder
try {
    fs.mkdirSync("zones");
} catch (e) {
}

// TLDs api
var host = "czds.icann.org";
function getList() {
    // Get the list of zonefiles that I can download
    return new Promise(function(accept, reject) {
        https.get({
            host: host,
            path: "/user-zone-data-urls.json?token=wAnaPFku3mSVN4KeuY4iHJUPuJf5s53N",
            method: "GET"
        }, function(response) {
            response.setEncoding("utf8");
            var data = "";
            response.on("data", function(chunk) {
                data += chunk
            });
            response.on("end", function() {
                try {
                    data = JSON.parse(data);
                    accept(data);
                } catch (e) {
                    reject(e);
                }
            });
            response.on("error", function(e) {
                reject(e);
            });
        });
    });
}

function httpGet(options) {
    return new Promise(function(accept, reject) {
        https.get(options, function(response) {
            accept(response);
        }).setTimeout(0);
    });
}

function* getHeaders(el) {
    var response = yield httpGet({
        host: host,
        path: el,
        method: "HEAD"
    });
    var h = response.headers;
    response.destroy();
    return h;
}

function* wait(time) {
    return new Promise(function(accept) {
        setTimeout(accept, time);
    });
}

function* downloadFile(el) {
    return new Promise(function(accept, reject) {
        new FastDownload("http://" + host + el, {
            destFile: tempName,
            chunksAtOnce: 2
        }, function(error, dl) {
            if (error) {
                reject(error);
            }
            dl.on("error", function(error) {
                reject(error);
            });
            dl.on("end", function() {
                accept();
            });
        });
    });
}

function* command(c, args) {
    return new Promise(function(accept, reject) {
        var srt = spawn(c, args);
        srt.on("close", accept);
    });
}

function nextLine(interface) {
    // yield a line from a readline interface
    if (interface.__lines) {
        if (interface.__lines.length > 0) {
            return interface.__lines.shift();
        } else if (interface.__lines.length == 0) {
            return new Promise(function(accept, reject) {
                interface.__newline = accept;
                interface.resume();
            });
        }
    } else {
        interface.__lines = [];
    }
    return new Promise(function(accept, reject) {
        interface.__newline = accept;
        interface.on("close", function() {
            if (interface.__newline) {
                interface.__newline();
                interface.__newline = null;
            } else {
                interface.__lines.push(function(cb) { cb() });
            }
        });
        interface.on("error", function(e) {
            if (interface.__newline) {
                interface.__newline(e);
                interface.__newline = null;
            } else {
                interface.__lines.push(function(cb) { cb(e) });
            }
        });
        interface.on("line", function(line) {
            if (interface.__newline) {
                interface.__newline([line]);
                interface.__newline = null;
            } else {
                interface.__lines.push([line]);
                if (interface.__lines.length > 1000) {
                    interface.pause();
                }
            }
        });
    });
}

function* downloadZone(el, zone) {
    var line, srt, rdline, cmd;

    // Predownload file instead of streaming the download stream directly to unzip, as long-lasting connections may be closed
    yield downloadFile(el);

    // Prepare and run the command to unzip, filter and sort
    cmd = unzippipe.replace(/\[ZONE\]/g, zone);
    yield command("/bin/sh", ["-c", cmd]);

    // If there are previous files, diff them and push changes to Satori
    if (fs.existsSync("zones/" + zone + ".dns.txt") && fs.existsSync("zones/" + zone + ".domains.txt")) {
        srt = spawn("diff", ["--speed-large-files", "zones/" + zone + ".dns.txt", "zones/" + zone + ".dns.txt2"]);
        rdline = readline.createInterface({
            input: srt.stdout,
            terminal: false,
            historySize: 0
        });
        while (line = yield nextLine(rdline)) {
            line = line[0];
            var cmd = line[0];
            if (cmd == "<") {
                line = line.slice(1).trim().split(/,?\s+/);
                console.log("Removed DNS", line);
                // Removed DNS
            } else if (cmd == ">") {
                line = line.slice(1).trim().split(/,?\s+/);
                console.log("Added DNS", line);
                // Added DNS
            }
        }

        srt = spawn("diff", ["--speed-large-files", "zones/" + zone + ".domains.txt", "zones/" + zone + ".domains.txt2"]);
        rdline = readline.createInterface({
            input: srt.stdout,
            terminal: false,
            historySize: 0
        });
        while (line = yield nextLine(rdline)) {
            line = line[0];
            if (line[0] == "<") {
                console.log("Removed DOMAIN", line);
                // Removed DOMAIN
            } else if (line[0] == ">") {
                console.log("Added DOMAIN", line);
                // Added DOMAIN
            }
        }
    }

    // Move new files to old locations, for future diffs
    try {
        fs.unlinkSync("zones/" + zone + ".dns.txt");
    } catch (e) {
    }
    try {
        fs.unlinkSync("zones/" + zone + ".domains.txt");
    } catch (e) {
    }
    try {
        fs.renameSync("zones/" + zone + ".dns.txt2", "zones/" + zone + ".dns.txt");
    } catch (e) {
    }
    try {
        fs.renameSync("zones/" + zone + ".domains.txt2", "zones/" + zone + ".domains.txt");
    } catch (e) {
    }
}

function* processZone(el, zone, size) {
    // Check if there's already a zonefile and compare the filesize to detect changes (no more headers to check for changes are received)
    var savedsize = 0;
    try {
        savedsize = Number(fs.readFileSync("zones/" + zone + ".size.txt", "utf8"));
    } catch (e) {
        savedsize = 0;
    }
    if (Number.isNaN(savedsize) || savedsize != size) {
        console.log("zone", zone, "size", size);
        yield downloadZone(el, zone);
        try {
            fs.writeFileSync("zones/" + zone + ".size.txt", size.toString(), "utf8")
        } catch (e) {
        }
    }
}

function* processElement(el) {
    // Get and process the headers for a zonefile
    var headers = yield getHeaders(el);
    var zone = null, size = null;
    try {
        var fname = headers["content-disposition"];
        var index = fname.indexOf("filename=\"") + 10;
        fname = fname.substring(index, fname.indexOf("\"", index));
        zone = fileReg.exec(fname)[2];
        size = Number(headers["content-length"]);
    } catch (e) {
        return;
    }
    if (zone && size > 0) {
        yield processZone(el, zone, size);
    }
}

function* run() {
    var list = yield getList();
    while (list.length > 0) {
        yield processElement(list.shift());
    }
}

function start() {
    co(function* () {
        while (true) {
            var start = Date.now();
            yield run();
            var dif = (2 * 60 * 60 * 1000) - (Date.now() - start); // Minimum loop: 2 hours
            if (dif > 0) {
                yield wait(dif);
            }
        }
    }).catch(function(e) {
        console.log(e);
    });
}