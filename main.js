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
var RTM = require("satori-rtm-sdk"); // TODO: Deprecated
var JSFtp = require("jsftp");

promisify(JSFtp, {
    yes: ["get", "ls"]
}); // Convert callbacks to Promises to easier yield

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
var awkarrayverisign = [];
for (var i = 0; i < registers.length; i++) {
    awkarray.push('\\$4 == \\"' + registers[i] + '\\"');
    awkarrayverisign.push('\\$2 == \\"' + registers[i].toUpperCase() + '\\"');
}

/**
 * Operations made in command lines as is faster and can be easily parallelized:
 * LC_ALL=C means bitwise comparison instead of UTF8 comparisons. Prevents conversion so is faster.
 * parallel creates multiple jobs to multithread a command
 * sort can be parallelized but needs to have big data to get it enabled. -S 25% means to load 25% of RAM. -S 1G also works
 * mawk is faster than awk
 */
var unzippipe = "export LC_ALL=C; pigz -dc " + tempName + " | parallel --jobs 4 --pipe mawk \\'" + awkarray.join(" \\|\\| ") + " {print \\$1, \\$4, \\$5}\\' | sort -S25% --parallel=4 -k1,1 -k2,2 -k3,3 | tee zones/[ZONE].dns.txt2 | parallel --jobs 4 --pipe mawk \\'{print \\$1}\\' | sort -S25% --parallel=4 -uo zones/[ZONE].domains.txt2"
var unzippipeverisign = "export LC_ALL=C; pigz -dc " + tempName + " | parallel --jobs 4 --pipe mawk \\'" + awkarrayverisign.join(" \\|\\| ") + " {print tolower\\(\\$1\\), tolower\\(\\$2\\), tolower\\(\\$3\\)}\\' | sort -S25% --parallel=4 -k1,1 -k2,2 -k3,3 | tee zones/[ZONE].dns.txt2 | parallel --jobs 4 --pipe mawk \\'{print \\$1}\\' | sort -S25% --parallel=4 -uo zones/[ZONE].domains.txt2"

// verisignEndpoints
var comnetftp = "rz.verisign-grs.com";
var nameftp = "rzname.verisign-grs.com";

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

function downloadFile(el) {
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

function* checkZone(zone, isverisign) {
    var line, srt, rdline, cmd;

    // Prepare and run the command to unzip, filter and sort
    cmd = (isverisign ? unzippipeverisign : unzippipe).replace(/\[ZONE\]/g, zone);
    yield command("/bin/sh", ["-c", cmd]);

    // If there are previous files, diff them and push changes to Satori
    if (fs.existsSync("zones/" + zone + ".dns.txt") && fs.existsSync("zones/" + zone + ".domains.txt")) {
        // comm is for detecting changes in sorted files and is faster that any diff, rdiff or whatever, and can handle huge files.
        srt = spawn("/bin/sh", ["-c", "export LC_ALL=C; comm --nocheck-order --output-delimiter=\"|\" -3 zones/" + zone + ".domains.txt zones/" + zone + ".domains.txt2"]);
        rdline = readline.createInterface({
            input: srt.stdout,
            terminal: false,
            historySize: 0
        });
        while (line = yield nextLine(rdline)) {
            line = line[0].split("|");
            if (line[0]) {
                line = line[0].trim();
                if (line.slice(-zone.length - 2) == "." + zone + ".") {
                    line = line.slice(0, line.length - zone.length - 2);
                }
                try {
                    rtm.publish(channel, {
                        "event": "removed_domain",
                        "zone": zone,
                        "domain": line
                    });
                } catch (e) {
                }
            } else if (line[1]) {
                line = line[1].trim();
                if (line.slice(-zone.length - 2) == "." + zone + ".") {
                    line = line.slice(0, line.length - zone.length - 2);
                }
                try {
                    rtm.publish(channel, {
                        "event": "new_domain",
                        "zone": zone,
                        "domain": line
                    });
                } catch (e) {
                }
            }
        }
        srt = spawn("/bin/sh", ["-c", "export LC_ALL=C; comm --nocheck-order --output-delimiter=\"|\" -3 zones/" + zone + ".dns.txt zones/" + zone + ".dns.txt2"]);
        rdline = readline.createInterface({
            input: srt.stdout,
            terminal: false,
            historySize: 0
        });
        while (line = yield nextLine(rdline)) {
            line = line[0].split("|");
            if (line[0]) {
                line = line[0].trim().split(/,?\s+/);
                var domain = line[0];
                if (domain.slice(-zone.length - 2) == "." + zone + ".") {
                    domain = domain.slice(0, domain.length - zone.length - 2);
                }
                try {
                    rtm.publish(channel, {
                        "event": "removed_record",
                        "zone": zone,
                        "domain": domain,
                        "type": line[1],
                        "value": line[2]
                    });
                } catch (e) {
                }    
            } else if (line[1]) {
                line = line[1].trim().split(/,?\s+/);
                var domain = line[0];
                if (domain.slice(-zone.length - 2) == "." + zone + ".") {
                    domain = domain.slice(0, domain.length - zone.length - 2);
                }
                try {
                    rtm.publish(channel, {
                        "event": "new_record",
                        "zone": zone,
                        "domain": domain,
                        "type": line[1],
                        "value": line[2]
                    });
                } catch (e) {
                }    
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
        // Predownload file instead of streaming the download stream directly to unzip, as long-lasting connections may be closed
        yield downloadFile(el);
        yield checkZone(zone);
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

function ftpConnect(domain) {
    return new Promise(function(accept, reject) {
        var ftp = new JSFtp({
            host: domain,
            user: credentials.verisign.user,
            pass: credentials.verisign.password,
        });
        ftp.on("connect", function() {
            accept(ftp);
        });
        ftp.on("timeout", reject);
    });
}

function* ftpCheck(domain) {
    var ftp = yield ftpConnect(domain);
    var list = yield ftp.ls(".");
    var zones = {
        "com.zone.gz": "com",
        "net.zone.gz": "net",
        "name.zone.gz": "name",
    };
    for (var i = 0, file; file = list[i]; i++) {
        if (zones[file.name]) {
            var zone = zones[file.name];
            var savedmodify;
            try {
                savedmodify = Number(fs.readFileSync("zones/" + zone + ".time.txt", "utf8"));
            } catch (e) {
                savedmodify = 0;
            }
            if (Number.isNaN(savedmodify) || savedmodify != file.time) {
                console.log("zone", zone, "time", file.time);
                // Predownload file instead of streaming the download stream directly to unzip, as long-lasting connections may be closed
                console.time("download");
                yield ftp.get(file.name, tempName);
                console.timeEnd("download");
                console.time("check");
                yield checkZone(zone, true);
                console.timeEnd("check");
                try {
                    fs.writeFileSync("zones/" + zone + ".time.txt", file.time.toString(), "utf8")
                } catch (e) {
                }
            }
        }
    }
}

function* run() {
    var list = yield getList();
    while (list.length > 0) {
        yield processElement(list.shift());
    }
    yield ftpCheck(comnetftp);
    // yield ftpCheck(nameftp); // TODO: Wait for IP change confirmation and check if FTP works in server
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

function promisify(cls, options) {
    options = options || {};
    for (var i in cls.prototype) {
        if ((!options.not || options.not.indexOf(i) < 0) && (!options.yes || options.yes.indexOf(i) > -1) && typeof cls.prototype[i] === "function") {
            (function(fn) {
                cls.prototype[i] = function() {
                    var args = new Array(arguments.length);
                    for (var i = 0; i < args.length; i++) {
                        args[i] = arguments[i];
                    }
                    var p = new Promise(function(accept, reject) {
                        args.push(function(e, r) {
                            if (e) {
                                reject(e);
                            } else {
                                accept(r);
                            }
                        });
                    });
                    var ret = fn.apply(this, args);
                    if (ret === undefined) {
                        return p;
                    } else {
                        return ret;
                    }
                };
            })(cls.prototype[i]);
        }
    }
}