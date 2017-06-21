*Detailed info for the [domains](https://www.satori.com/channels/domains) channel at [Satori.com](https://www.satori.com/).*

## What's this?
Zone files contains mappings between domain names and IP addresses and other resources, organized in the form of text representations of resource records. Top Level Domain (TLD) maintainers have also their own zone file, with all the registered domains on it, so when you register a new domain it is added to that *big* zone file, and when you don't renew it anymore it is removed. That's it. This script peeks and parses zone files from hundreds of TLDs so you can receive in a stream what domains where added, removed or had their DNS records changed. With this script you can know *the status* of the Internet.

## DNS Records
The DNS records the script is watching for are:

- `soa`
- `ns`
- `a`
- `aaaa`
- `cname`
- `mx`
- `ptr`

*Remember that the DNS records streamed are the ones in the main zonefiles, not the ones in the nameservers. For additional DNS data you may need to ask the nameservers of each domain.*

## Events
The events streamed are

- `new_domain`, with the format: `{ event: "new_domain", zone: "zone", domain: "domain" }`
- `deleted_domain`, with the format: `{ event: "deleted_domain", zone: "zone", domain: "domain" }`
- `new_record`, with the format: `{ event: "new_record", zone: "zone", domain: "domain", type: "record_type", value: "record_value" }`
- `deleted_record`, with the format: `{ event: "deleted_record", zone: "zone", domain: "domain", type: "record_type", value: "record_value" }`

The properties are

- `event`, obviously the event type.
- `zone`, the TLD of the event, for example for `mydomain.xyz`, the zone is `xyz`
- `domain`, the domain name with the TLD stripped. For example, for `mydomain.xyz` the domain is `mydomain`.
- `type`, the DNS record type. Must be any of the ones listed in the [**DNS Records**](#dns-records) section.
- `value`, the DNS record value. For example, for a `ns` record (the most common) the nameserver where the domain is pointing at, so you know where to look for extra DNS data.

## Intervals
The loop lasts about 2 hours in peeking all the TLDs zonefiles, but this don't means that each 2 hours you are going to get updates. Although domains are created/removed each minute, zonefiles are not updated each minute by their maintainers. Some of them are updated multiple times per day and others only one time per day. Depends on the maintainer.

## Application examples
- Know when a domain changed `ns`, meaning that has been transferred (usually).
- Know when a domain has dropped, to register it by yourself.
- Make statistics of how much domains are created and removed each day per TLD.
- Knowing the registrars common domains (`domaincontrol.com` for GoDaddy, for example), know how much domains a registrar has registered/lost each day.
- Know the trending words being registered, comparing the words registered on different TLDs for a period of time. For example, early on June 2017 the domain `covfefe` started to appear in a lot of different TLDs, without even being a word.
  
## Domain list
~~As you may know, accessing `com` and `net` zonefiles is not trivial. I'm talking with Verisign (The maintainer) and they accepted my request, so will have access in the next days/weeks, but not now.~~

**Already implemented `com` and `net` domains**. Waiting for `name` and `org`.

*This list grows each day and will be updated from time to time. GitHub will keep the track of changes. Current count: 857 TLDs*

- aaa
- aarp
- abbott
- abbvie
- abogado
- abudhabi
- academy
- accountant
- accountants
- aco
- active
- actor
- adac
- ads
- adult
- aetna
- afamilycompany
- africa
- agakhan
- agency
- aig
- aigo
- airforce
- airtel
- akdn
- allfinanz
- alsace
- americanfamily
- amfam
- amsterdam
- android
- apartments
- app
- aquarelle
- arab
- archi
- army
- art
- asda
- associates
- athleta
- attorney
- auction
- audible
- audio
- author
- auto
- autos
- avianca
- aws
- axa
- azure
- baby
- bananarepublic
- band
- bank
- bar
- barcelona
- bargains
- baseball
- basketball
- bauhaus
- bayern
- bbc
- bcn
- beauty
- beer
- bentley
- best
- bestbuy
- bet
- bharti
- bid
- bike
- bing
- bingo
- bio
- black
- blackfriday
- blog
- blue
- bmw
- boats
- bom
- boo
- book
- booking
- boots
- bostik
- boston
- bot
- boutique
- box
- bradesco
- bridgestone
- broadway
- brother
- brussels
- budapest
- builders
- business
- buy
- buzz
- cab
- cafe
- cal
- call
- calvinklein
- cam
- camera
- camp
- cancerresearch
- canon
- capetown
- capital
- capitalone
- car
- caravan
- cards
- care
- career
- careers
- cars
- cartier
- casa
- cash
- casino
- cat
- catering
- catholic
- cbn
- cbs
- center
- ceo
- cern
- channel
- chase
- chat
- cheap
- chloe
- christmas
- chrome
- church
- circle
- cisco
- citadel
- citic
- city
- claims
- cleaning
- click
- clinic
- clothing
- cloud
- club
- coach
- codes
- coffee
- college
- cologne
- com
- community
- company
- compare
- computer
- comsec
- condos
- construction
- consulting
- contact
- contractors
- cooking
- cool
- coop
- corsica
- country
- coupon
- coupons
- courses
- credit
- creditcard
- creditunion
- cricket
- crs
- cruises
- csc
- cuisinella
- cymru
- dabur
- dad
- dance
- date
- dating
- datsun
- day
- dclk
- dds
- deal
- dealer
- deals
- degree
- delivery
- dell
- deloitte
- delta
- democrat
- dental
- dentist
- design
- dev
- dhl
- diamonds
- diet
- digital
- direct
- directory
- discount
- dnp
- docs
- doctor
- dog
- domains
- download
- drive
- dubai
- duck
- duns
- dupont
- durban
- dvag
- earth
- eat
- eco
- education
- email
- emerck
- energy
- engineer
- engineering
- enterprises
- epost
- epson
- equipment
- erni
- esq
- estate
- eurovision
- events
- everbank
- exchange
- expert
- exposed
- express
- extraspace
- fail
- fairwinds
- faith
- family
- fan
- fans
- farm
- farmers
- fashion
- fast
- feedback
- ferrero
- film
- final
- finance
- financial
- fire
- firestone
- fish
- fishing
- fit
- fitness
- flickr
- flights
- florist
- flowers
- fly
- foo
- football
- forsale
- forum
- foundation
- fox
- free
- fresenius
- frl
- frogans
- frontier
- ftr
- fujitsu
- fujixerox
- fun
- fund
- furniture
- futbol
- fyi
- gallery
- game
- games
- gap
- garden
- gbiz
- gea
- gent
- george
- ggee
- gift
- gifts
- gives
- glade
- glass
- gle
- global
- globo
- gmail
- gmbh
- gmo
- gmx
- godaddy
- gold
- goldpoint
- golf
- goo
- goog
- google
- gop
- got
- grainger
- graphics
- gratis
- green
- gripe
- group
- guardian
- gucci
- guge
- guide
- guitars
- guru
- hair
- hangout
- haus
- hbo
- hdfc
- health
- healthcare
- help
- helsinki
- here
- hiphop
- hisamitsu
- hitachi
- hiv
- hkt
- hockey
- holdings
- holiday
- homegoods
- homes
- homesense
- honda
- honeywell
- horse
- hospital
- host
- hosting
- hot
- hoteles
- hotels
- hotmail
- house
- how
- hsbc
- hyatt
- hyundai
- icu
- ieee
- imamat
- imdb
- immo
- immobilien
- industries
- infiniti
- ing
- ink
- institute
- insurance
- insure
- international
- intuit
- investments
- irish
- iselect
- ismaili
- iwc
- jcb
- jetzt
- jewelry
- jio
- jlc
- jnj
- jobs
- joburg
- jot
- joy
- jpmorgan
- jprs
- juegos
- kaufen
- kddi
- kfh
- kia
- kim
- kinder
- kindle
- kitchen
- kiwi
- koeln
- komatsu
- kosher
- kpmg
- kpn
- krd
- kred
- kyoto
- lancaster
- lancome
- land
- law
- lawyer
- lds
- lease
- legal
- lexus
- lgbt
- liaison
- life
- lifeinsurance
- lighting
- like
- limited
- limo
- link
- live
- lixil
- loan
- loans
- locus
- lol
- london
- lotte
- lotto
- ltd
- ltda
- luxe
- macys
- madrid
- maison
- makeup
- man
- management
- market
- marketing
- marriott
- marshalls
- mattel
- mba
- mcd
- mcdonalds
- med
- media
- meet
- melbourne
- meme
- memorial
- men
- menu
- meo
- miami
- microsoft
- mini
- mint
- mit
- mitsubishi
- mlb
- mls
- mma
- moda
- moe
- moi
- mom
- monash
- money
- montblanc
- mormon
- mortgage
- motorcycles
- mov
- movie
- movistar
- msd
- mtn
- mtpc
- mtr
- museum
- mutual
- nagoya
- navy
- nec
- net
- netflix
- network
- neustar
- new
- news
- nexus
- nfl
- ngo
- nhk
- nico
- ninja
- nissan
- nokia
- norton
- now
- nowruz
- nowtv
- nra
- nrw
- nyc
- observer
- off
- office
- okinawa
- olayan
- olayangroup
- oldnavy
- one
- ong
- onl
- online
- ooo
- organic
- osaka
- otsuka
- ovh
- page
- panasonic
- panerai
- paris
- pars
- partners
- parts
- party
- passagens
- pay
- pccw
- pet
- pfizer
- pharmacy
- philips
- photo
- photography
- photos
- physio
- piaget
- pics
- pictet
- pictures
- pid
- pin
- ping
- pink
- pioneer
- pizza
- place
- play
- playstation
- plumbing
- plus
- pohl
- poker
- porn
- pramerica
- praxi
- press
- prime
- pro
- prod
- productions
- prof
- promo
- properties
- property
- protection
- pru
- prudential
- pub
- qpon
- racing
- radio
- raid
- read
- realty
- recipes
- red
- rehab
- reise
- reisen
- reit
- reliance
- ren
- rent
- rentals
- repair
- report
- republican
- rest
- restaurant
- review
- reviews
- rich
- richardli
- ricoh
- rightathome
- ril
- rio
- rip
- rocher
- rocks
- rodeo
- room
- rsvp
- rugby
- ruhr
- run
- ryukyu
- saarland
- safe
- safety
- sakura
- sale
- salon
- samsclub
- samsung
- sap
- sapo
- sarl
- save
- sbi
- sca
- scb
- schaeffler
- schmidt
- scholarships
- school
- schule
- science
- scjohnson
- secure
- security
- select
- services
- ses
- sew
- sex
- sexy
- sfr
- sharp
- shell
- shia
- shiksha
- shoes
- shop
- shopping
- show
- showtime
- shriram
- silk
- singles
- site
- ski
- skin
- sky
- skype
- smart
- smile
- soccer
- social
- softbank
- software
- sohu
- solar
- solutions
- song
- sony
- soy
- space
- spiegel
- spot
- srl
- stada
- staples
- star
- statebank
- statefarm
- stc
- stcgroup
- stockholm
- storage
- store
- stream
- studio
- study
- style
- sucks
- supplies
- supply
- support
- surf
- surgery
- suzuki
- swiftcover
- swiss
- sydney
- symantec
- systems
- taipei
- talk
- target
- tatar
- tattoo
- tax
- taxi
- tci
- team
- tech
- technology
- tel
- telefonica
- tennis
- teva
- theater
- theatre
- tickets
- tienda
- tiffany
- tips
- tires
- tirol
- tjmaxx
- tjx
- tkmaxx
- today
- tokyo
- tools
- top
- toray
- toshiba
- total
- tours
- town
- toyota
- toys
- trade
- trading
- training
- travel
- trust
- tui
- tunes
- tushu
- tvs
- university
- uol
- vacations
- vegas
- ventures
- verisign
- versicherung
- vet
- viajes
- video
- villas
- vin
- vip
- virgin
- vision
- viva
- vlaanderen
- vodka
- vote
- voto
- voyage
- vuelos
- wales
- walmart
- wang
- wanggou
- watch
- watches
- weather
- weatherchannel
- webcam
- website
- wedding
- whoswho
- wien
- wiki
- win
- windows
- wine
- winners
- wme
- wolterskluwer
- work
- works
- world
- wow
- wtc
- wtf
- xbox
- xerox
- xn--11b4c3d
- xn--1ck2e1b
- xn--1qqw23a
- xn--30rr7y
- xn--3bst00m
- xn--3ds443g
- xn--3pxu8k
- xn--42c2d9a
- xn--45q11c
- xn--4gbrim
- xn--55qw42g
- xn--55qx5d
- xn--5tzm5g
- xn--6frz82g
- xn--6qq986b3xl
- xn--80aqecdr1a
- xn--9dbq2a
- xn--9et52u
- xn--bck1b9a5dre4c
- xn--c1avg
- xn--c2br7g
- xn--cck2b3b
- xn--cg4bki
- xn--czrs0t
- xn--czru2d
- xn--d1acj3b
- xn--eckvdtc9d
- xn--fct429k
- xn--fhbei
- xn--fiq228c5hs
- xn--fiq64b
- xn--fjq720a
- xn--flw351e
- xn--fzys8d69uvgm
- xn--g2xx48c
- xn--gckr3f0f
- xn--gk3at1e
- xn--hxt814e
- xn--i1b6b1a6a2e
- xn--io0a7i
- xn--j1aef
- xn--jlq61u9w7b
- xn--jvr189m
- xn--kcrx77d1x4a
- xn--kpu716f
- xn--kput3i
- xn--mgba7c0bbn0a
- xn--mgbca7dzdo
- xn--mgbi4ecexp
- xn--mgbt3dhd
- xn--mk1bu44c
- xn--ngbc5azd
- xn--ngbe9e0a
- xn--ngbrx
- xn--nqv7f
- xn--nqv7fs00ema
- xn--nyqy26a
- xn--p1acf
- xn--pbt977c
- xn--pssy2u
- xn--q9jyb4c
- xn--qcka1pmc
- xn--rhqv96g
- xn--rovu88b
- xn--t60b56a
- xn--tckwe
- xn--tiq49xqyj
- xn--unup4y
- xn--vermgensberater-ctb
- xn--vermgensberatung-pwb
- xn--vhquv
- xn--xhq521b
- xn--zfr164b
- xxx
- xyz
- yachts
- yahoo
- yamaxun
- yandex
- yodobashi
- yoga
- yokohama
- you
- youtube
- z
- zappos
- zara
- zero
- zip
- zone
- zuerich