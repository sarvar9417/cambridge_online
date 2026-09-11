import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h2p-overview-prior',slideId:'h2-overview',role:'hook',eyebrow:'CHAPTER 2 · STARTER',title:'What already happens when one computer communicates with another?',block:{index:0}}),
  s({id:'h2p-overview-route',slideId:'h2-overview',role:'objective',eyebrow:'CHAPTER 2 · LEARNING ROUTE',title:'Communication: from a local network to an internet resource',lead:true,bullets:true}),
];

const TOPIC_21_BEFORE_CLIENTS:AuthoredSceneSpec[]=[
  s({id:'h2p-211-arpanet',slideId:'h2-211-arpanet-lan-wan',role:'visual',eyebrow:'2.1.1 · NETWORK SCALE',lead:true,block:{index:0}}),
  s({id:'h2p-214-sizes',slideId:'h2-214-sizes',role:'compare',eyebrow:'2.1.1 · PAN → LAN → MAN → WAN',lead:true,block:{index:0}}),
  s({id:'h2p-21-infrastructure',slideId:'h2-21-infra',role:'visual',eyebrow:'2.1.1 · NETWORK INFRASTRUCTURE',lead:true,block:{index:0}}),
  s({id:'h2p-21-benefits',slideId:'h2-21-benefits',role:'concept',eyebrow:'2.1.1 · WHY NETWORK?',lead:true,bullets:true}),
  s({id:'h2p-21-drawbacks',slideId:'h2-21-drawbacks',role:'compare',eyebrow:'2.1.1 · TRADE-OFFS',lead:true,bullets:true}),
  s({id:'h2p-211-private-public-wlan',slideId:'h2-211-private-public-wlan',role:'concept',eyebrow:'2.1.1 · OWNERSHIP AND ACCESS',lead:true,bullets:true}),

  s({id:'h2p-212-client-server-core',slideId:'h2-212-client-server',role:'concept',eyebrow:'2.1.2 · CLIENT-SERVER',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-212-client-server-cycle',slideId:'h2-212-client-server',role:'process',eyebrow:'2.1.2 · REQUEST → RESPONSE',title:'Trace one client-server exchange',block:{index:0}}),
  s({id:'h2p-212-client-server-example',slideId:'h2-212-client-server',role:'visual',eyebrow:'2.1.2 · APPLICATION',title:'Recognise client-server systems around you',example:true}),
  s({id:'h2p-212-p2p-core',slideId:'h2-212-p2p',role:'concept',eyebrow:'2.1.2 · PEER-TO-PEER',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-212-model-compare',slideId:'h2-212-comparison',role:'compare',eyebrow:'2.1.2 · COMPARE MODELS',lead:true,block:{index:0}}),
];

const TOPIC_21_AFTER_CLIENTS:AuthoredSceneSpec[]=[
  s({id:'h2p-activity-2a',slideId:'h2-activity-2a',role:'challenge',eyebrow:'ACTIVITY 2A · DECIDE AND JUSTIFY',lead:true,block:{index:0}}),

  s({id:'h2p-213-topologies-bus-star',slideId:'h2-213-topologies',role:'compare',eyebrow:'2.1.3 · TOPOLOGIES',title:'Bus and star: central cable or central device?',block:{index:0,range:[0,2]}}),
  s({id:'h2p-213-topologies-mesh-hybrid',slideId:'h2-213-topologies',role:'compare',eyebrow:'2.1.3 · TOPOLOGIES',title:'Mesh and hybrid: resilience or combination?',block:{index:0,range:[2,4]}}),
  s({id:'h2p-213-bus-visual',slideId:'h2-topology-visual-bus-star',role:'visual',eyebrow:'FIGURE 2.6 · BUS',title:'One shared cable carries the traffic',block:{index:0}}),
  s({id:'h2p-213-star-visual',slideId:'h2-topology-visual-bus-star',role:'visual',eyebrow:'FIGURE 2.7 · STAR',title:'Every node has its own link to the centre',block:{index:1}}),
  s({id:'h2p-213-mesh-visual',slideId:'h2-topology-visual-mesh-hybrid',role:'visual',eyebrow:'FIGURE 2.8 · MESH',title:'Alternate routes keep a mesh connected',block:{index:0}}),
  s({id:'h2p-213-hybrid-visual',slideId:'h2-topology-visual-mesh-hybrid',role:'visual',eyebrow:'FIGURE 2.9 · HYBRID',title:'A hybrid joins existing network layouts',block:{index:1}}),
  s({id:'h2p-213-choice',slideId:'h2-213-topologies',role:'challenge',eyebrow:'2.1.3 · CHOOSE A TOPOLOGY',title:'Match the topology to the requirement',example:true}),
  s({id:'h2p-extension-2a',slideId:'h2-extension-2a',role:'challenge',eyebrow:'EXTENSION 2A',title:'Do not confuse a network model with a topology',block:{index:0}}),

  s({id:'h2p-215-cloud-types',slideId:'h2-215-cloud',role:'compare',eyebrow:'2.1.4 · CLOUD',lead:true,keyTerms:true,block:{index:0}}),
  s({id:'h2p-215-cloud-storage-a',slideId:'h2-215-cloud-storage',role:'compare',eyebrow:'TABLE 2.3 · CLOUD STORAGE',title:'Benefits and risks · part 1',block:{index:0,range:[0,3]}}),
  s({id:'h2p-215-cloud-storage-b',slideId:'h2-215-cloud-storage',role:'compare',eyebrow:'TABLE 2.3 · CLOUD STORAGE',title:'Benefits and risks · part 2',block:{index:0,range:[3,5]}}),
  s({id:'h2p-215-cloud-security',slideId:'h2-215-cloud-storage-source-detail',role:'concept',eyebrow:'2.1.4 · CLOUD SECURITY',lead:true,bullets:true}),

  s({id:'h2p-216-cables-a',slideId:'h2-216-wired',role:'compare',eyebrow:'2.1.5 · WIRED MEDIA',title:'Copper and fibre · signal, rate and attenuation',block:{index:0,range:[0,3]}}),
  s({id:'h2p-216-cables-b',slideId:'h2-216-wired',role:'compare',eyebrow:'2.1.5 · WIRED MEDIA',title:'Copper and fibre · interference, cost and capacity',block:{index:0,range:[3,6]}}),
  s({id:'h2p-216-wireless-properties',slideId:'h2-216-attenuation',role:'concept',eyebrow:'2.1.5 · WIRELESS MEDIA',lead:true,bullets:true}),
  s({id:'h2p-216-fibre-modes',slideId:'h2-216-fibre-modes',role:'compare',eyebrow:'2.1.5 · FIBRE MODES',lead:true,block:{index:0}}),
  s({id:'h2p-extension-2b',slideId:'h2-extension-2b',role:'challenge',eyebrow:'EXTENSION 2B · CALCULATE',title:'Link wavelength and frequency',lead:true,block:{index:0}}),
  s({id:'h2p-216-wired-wireless-a',slideId:'h2-216-wireless',role:'compare',eyebrow:'2.1.5 · WIRED VS WIRELESS',title:'Expansion, mobility and reliability',block:{index:0,range:[0,3]}}),
  s({id:'h2p-216-wired-wireless-b',slideId:'h2-216-wireless',role:'compare',eyebrow:'2.1.5 · WIRED VS WIRELESS',title:'Security, transfer rate and practical cost',block:{index:0,range:[3,6]}}),
  s({id:'h2p-216-frequency-hopping',slideId:'h2-216-spread-spectrum',role:'process',eyebrow:'2.1.5 · BLUETOOTH',lead:true,bullets:true}),
  s({id:'h2p-216-wnic',slideId:'h2-216-wnic',role:'compare',eyebrow:'2.1.6 · WNIC MODES',lead:true,block:{index:0}}),

  s({id:'h2p-217-devices-a',slideId:'h2-217-devices',role:'visual',eyebrow:'2.1.6 · NETWORK DEVICES',title:'Hub, switch, router and bridge',block:{index:0,range:[0,4]}}),
  s({id:'h2p-217-devices-b',slideId:'h2-217-devices',role:'visual',eyebrow:'2.1.6 · NETWORK DEVICES',title:'Gateway, modem and NIC',block:{index:0,range:[4,7]}}),
  s({id:'h2p-217-repeaters',slideId:'h2-217-repeaters',role:'concept',eyebrow:'2.1.6 · REPEATER',lead:true,bullets:true}),
  s({id:'h2p-217-hubs',slideId:'h2-217-hubs',role:'compare',eyebrow:'2.1.6 · HUB',lead:true,bullets:true,block:{index:0}}),
  s({id:'h2p-217-switches',slideId:'h2-217-switches',role:'concept',eyebrow:'2.1.6 · SWITCH',lead:true,bullets:true}),
  s({id:'h2p-217-bridges',slideId:'h2-217-bridges',role:'concept',eyebrow:'2.1.6 · BRIDGE',lead:true,bullets:true}),
  s({id:'h2p-217-routers',slideId:'h2-217-routers',role:'process',eyebrow:'2.1.6 · ROUTER',lead:true,block:{index:0}}),
  s({id:'h2p-217-gateways',slideId:'h2-217-gateways',role:'concept',eyebrow:'2.1.6 · GATEWAY',lead:true,bullets:true}),
  s({id:'h2p-217-router-gateway',slideId:'h2-217-routers-gateways',role:'compare',eyebrow:'TABLE 2.6 · ROUTER VS GATEWAY',lead:true,block:{index:0}}),
  s({id:'h2p-217-softmodem',slideId:'h2-216-softmodem',role:'concept',eyebrow:'2.1.6 · SOFTMODEM',lead:true,bullets:true}),
  s({id:'h2p-217-modem-path',slideId:'h2-217-modems',role:'process',eyebrow:'2.1.6 · MODEM',lead:true,example:true}),
  s({id:'h2p-217-nic',slideId:'h2-217-nic-wnic',role:'concept',eyebrow:'2.1.6 · NIC / WNIC',lead:true,bullets:true}),
  s({id:'h2p-extension-2c',slideId:'h2-extension-2c',role:'challenge',eyebrow:'EXTENSION 2C · DESIGN',title:'Join three LANs that use different protocols',lead:true,block:{index:0}}),

  s({id:'h2p-218-ethernet',slideId:'h2-218-ethernet',role:'concept',eyebrow:'2.1.7 · ETHERNET',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-218-conflicts',slideId:'h2-218-conflicts',role:'concept',eyebrow:'2.1.7 · IP ADDRESS CONFLICT',lead:true,bullets:true}),
  s({id:'h2p-218-collisions',slideId:'h2-218-collisions',role:'concept',eyebrow:'2.1.7 · DATA COLLISION',lead:true,bullets:true}),
  s({id:'h2p-218-csma-process',slideId:'h2-218-csma-cd',role:'process',eyebrow:'2.1.7 · CSMA/CD',title:'Detect, stop, back off, retry',block:{index:0}}),
  s({id:'h2p-218-csma-counter',slideId:'h2-218-csma-cd',role:'visual',eyebrow:'2.1.7 · RETRY CONTROL',title:'The retry counter prevents uncontrolled retransmission',block:{index:1}}),
  s({id:'h2p-218-csma-trace',slideId:'h2-218-csma-cd',role:'challenge',eyebrow:'2.1.7 · TRACE A COLLISION',title:'Explain the complete collision route',activity:true}),
  s({id:'h2p-extension-2d',slideId:'h2-extension-2d',role:'challenge',eyebrow:'EXTENSION 2D · DESIGN',title:'Prevent an endless retry loop',lead:true,block:{index:0}}),

  s({id:'h2p-219-stream-core',slideId:'h2-219-bitstreaming',role:'concept',eyebrow:'2.1.8 · BIT STREAMING',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-219-stream-path',slideId:'h2-219-bitstreaming',role:'process',eyebrow:'FIGURE 2.21 · DATA FLOW',title:'Server → network → buffer → media player',block:{index:0}}),
  s({id:'h2p-219-buffer',slideId:'h2-219-buffering',role:'concept',eyebrow:'2.1.8 · BUFFER MANAGEMENT',lead:true,bullets:true}),
  s({id:'h2p-219-pros-cons-a',slideId:'h2-219-pros-cons',role:'compare',eyebrow:'TABLE 2.7 · BIT STREAMING',title:'Benefits and problems · part 1',block:{index:0,range:[0,3]}}),
  s({id:'h2p-219-pros-cons-b',slideId:'h2-219-pros-cons',role:'compare',eyebrow:'TABLE 2.7 · BIT STREAMING',title:'Benefits and problems · part 2',block:{index:0,range:[3,5]}}),
  s({id:'h2p-219-on-demand',slideId:'h2-219-on-demand',role:'process',eyebrow:'2.1.8 · ON DEMAND',lead:true,bullets:true}),
  s({id:'h2p-219-real-time',slideId:'h2-219-real-time',role:'compare',eyebrow:'2.1.8 · ON DEMAND VS REAL TIME',lead:true,block:{index:0}}),
  s({id:'h2p-activity-2b-a',slideId:'h2-activity-2b',role:'challenge',eyebrow:'ACTIVITY 2B · APPLY',title:'Networking, models and topologies',block:{index:0,range:[0,5]}}),
  s({id:'h2p-activity-2b-b',slideId:'h2-activity-2b',role:'challenge',eyebrow:'ACTIVITY 2B · APPLY',title:'Cloud, connectivity and streaming',block:{index:0,range:[5,11]}}),

  s({id:'h2p-book-q1',slideId:'h2-book-eoc-q1',role:'exam',eyebrow:'BOOK EXAM CHECK · Q1',activity:true}),
  s({id:'h2p-book-q2',slideId:'h2-book-eoc-q2',role:'exam',eyebrow:'BOOK EXAM CHECK · Q2',activity:true}),
  s({id:'h2p-book-q3',slideId:'h2-book-eoc-q3',role:'exam',eyebrow:'BOOK EXAM CHECK · Q3',activity:true}),
  s({id:'h2p-book-q4',slideId:'h2-book-eoc-q4',role:'exam',eyebrow:'BOOK EXAM CHECK · Q4',activity:true}),
  s({id:'h2p-book-q5',slideId:'h2-book-eoc-q5',role:'exam',eyebrow:'BOOK EXAM CHECK · Q5',activity:true}),
];

const TOPIC_22:AuthoredSceneSpec[]=[
  s({id:'h2p-221-internet',slideId:'h2-221-internet',role:'concept',eyebrow:'2.2.1 · INTERNET',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-221-web',slideId:'h2-221-web',role:'concept',eyebrow:'2.2.1 · WORLD WIDE WEB',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-222-access-parts',slideId:'h2-222-hardware',role:'concept',eyebrow:'2.2.2 · INTERNET ACCESS',lead:true,bullets:true}),
  s({id:'h2p-222-access-route',slideId:'h2-222-hardware',role:'process',eyebrow:'2.2.2 · CONNECTION ROUTE',title:'Device → router → modem → ISP → internet',block:{index:0}}),
  s({id:'h2p-222-pstn',slideId:'h2-222-pstn',role:'concept',eyebrow:'2.2.2 · PSTN',lead:true,bullets:true}),
  s({id:'h2p-222-voip',slideId:'h2-222-voip',role:'process',eyebrow:'2.2.2 · VOIP',lead:true,bullets:true,example:true}),
  s({id:'h2p-222-pstn-voip',slideId:'h2-222-pstn-voip',role:'compare',eyebrow:'2.2.2 · CIRCUIT VS PACKET USE',lead:true,block:{index:0}}),
  s({id:'h2p-222-satellites',slideId:'h2-222-satellites',role:'visual',eyebrow:'2.2.2 · SATELLITE ORBITS',lead:true,block:{index:0}}),

  s({id:'h2p-223-ipv4',slideId:'h2-223-ipv4',role:'concept',eyebrow:'2.2.3 · IPV4',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-223-classes',slideId:'h2-223-classes',role:'visual',eyebrow:'TABLE 2.8 · IPV4 CLASSES',lead:true,block:{index:0}}),
  s({id:'h2p-223-binary',slideId:'h2-223-binary',role:'visual',eyebrow:'2.2.3 · ADDRESS STRUCTURE',title:'Relate dotted decimal, binary, netID and hostID',example:true}),
  s({id:'h2p-223-cidr',slideId:'h2-223-cidr',role:'process',eyebrow:'2.2.3 · CIDR',lead:true,bullets:true}),
  s({id:'h2p-extension-2e',slideId:'h2-extension-2e',role:'challenge',eyebrow:'EXTENSION 2E · NAT',lead:true,block:{index:0}}),
  s({id:'h2p-223-ipv6',slideId:'h2-223-ipv6',role:'compare',eyebrow:'2.2.3 · IPV6',lead:true,bullets:true}),
  s({id:'h2p-223-zero-compression',slideId:'h2-223-ipv6-compression',role:'process',eyebrow:'2.2.3 · ZERO COMPRESSION',lead:true,bullets:true}),
  s({id:'h2p-223-zero-compression-check',slideId:'h2-223-ipv6-compression',role:'challenge',eyebrow:'2.2.3 · VALID OR INVALID?',title:'A double colon can only remove one run',example:true}),
  s({id:'h2p-223-subnet-core',slideId:'h2-223-subnetting',role:'concept',eyebrow:'2.2.3 · SUB-NETTING',lead:true,bullets:true}),
  s({id:'h2p-223-subnet-example',slideId:'h2-223-subnetting',role:'visual',eyebrow:'TABLE 2.9 · UNIVERSITY EXAMPLE',title:'Split one host field into subnet and host portions',example:true}),
  s({id:'h2p-223-private-public',slideId:'h2-223-private-public',role:'compare',eyebrow:'2.2.3 · PRIVATE VS PUBLIC IP',lead:true,bullets:true,block:{index:0}}),

  s({id:'h2p-224-url-structure',slideId:'h2-224-urls',role:'visual',eyebrow:'2.2.4 · URL',lead:true,keyTerms:true,block:{index:0}}),
  s({id:'h2p-224-url-check',slideId:'h2-224-urls',role:'challenge',eyebrow:'2.2.4 · DECOMPOSE A URL',title:'Identify protocol, domain and path',example:true}),
  s({id:'h2p-225-dns-core',slideId:'h2-225-dns',role:'concept',eyebrow:'2.2.5 · DNS',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-225-dns-process',slideId:'h2-225-dns',role:'process',eyebrow:'FIGURE 2.25 · DNS LOOKUP',title:'Resolve the name, then connect to the IP address',block:{index:0}}),
  s({id:'h2p-225-dns-example',slideId:'h2-225-dns',role:'visual',eyebrow:'2.2.5 · TRACE',title:'Follow one complete lookup',example:true}),

  s({id:'h2p-226-html-core',slideId:'h2-226-html',role:'concept',eyebrow:'2.2.6 · HTML',lead:true,keyTerms:true,bullets:true}),
  s({id:'h2p-226-html-structure',slideId:'h2-226-html',role:'visual',eyebrow:'2.2.6 · HTML STRUCTURE',title:'Read the page skeleton before the embedded script',block:{index:0}}),
  s({id:'h2p-226-js-code',slideId:'h2-226-javascript',role:'visual',eyebrow:'2.2.6 · JAVASCRIPT',lead:true,keyTerms:true,block:{index:0}}),
  s({id:'h2p-226-php-code',slideId:'h2-226-php',role:'visual',eyebrow:'2.2.6 · PHP',lead:true,keyTerms:true,block:{index:0}}),
  s({id:'h2p-226-client-server-side',slideId:'h2-226-client-server-side',role:'compare',eyebrow:'2.2.6 · WHERE DOES THE SCRIPT RUN?',lead:true,block:{index:0}}),
  s({id:'h2p-extension-2f',slideId:'h2-extension-2f',role:'challenge',eyebrow:'EXTENSION 2F · READ CODE',lead:true,block:{index:0}}),
  s({id:'h2p-activity-2c-a',slideId:'h2-activity-2c',role:'challenge',eyebrow:'ACTIVITY 2C · APPLY',title:'Internet infrastructure and addressing',block:{index:0,range:[0,5]}}),
  s({id:'h2p-activity-2c-b',slideId:'h2-activity-2c',role:'challenge',eyebrow:'ACTIVITY 2C · APPLY',title:'URLs, DNS and internet/WWW distinction',block:{index:0,range:[5,12]}}),
];

function thinThickScenes():LessonPresentationBeat[] {
  return [
    authoredStaticScene('h2p-212-thin-thick-definition','h2-212-p2p','compare','2.1.2 · THIN VS THICK CLIENT','Where does the processing and storage depend on?',[35],{
      richBlock:{kind:'comparison',leftTitle:'Thin client',rightTitle:'Thick client',rows:[
        ['Depends on continuous access to a powerful computer or server','Can work online or offline and can still do some processing'],
        ['Examples: web browser/mobile app needing a server; supermarket POS terminal','Examples: PC/laptop/tablet; a game that can also run locally'],
      ]},
    }),
    authoredStaticScene('h2p-212-thin-thick-hardware','h2-activity-2a','compare','TABLE 2.1 · HARDWARE TRADE-OFFS','Thick and thin client hardware have different strengths',[36],{
      richBlock:{kind:'table',table:{caption:'Table 2.1 · Summary of pros and cons of thick and thin client hardware',headers:['Client type','Pros','Cons'],rows:[
        ['Thick','More robust; clients have more control of programs and data','Less secure; each client needs individual updates; possible data-integrity inconsistencies'],
        ['Thin','Less expensive to expand; central updates; server can protect against hacking and malware','High reliance on server/link; start-up costs can be higher'],
      ]}},
    }),
    authoredStaticScene('h2p-212-thin-thick-software','h2-activity-2a','compare','TABLE 2.2 · SOFTWARE','Thin and thick client software use local resources differently',[36],{
      richBlock:{kind:'comparison',leftTitle:'Thin client software',rightTitle:'Thick client software',rows:[
        ['Always relies on connection to a remote server/computer','Can run some features without a server'],
        ['Requires very few local resources','Relies heavily on local resources'],
        ['Needs a good, stable and fast network','More tolerant of a slow network'],
        ['Stores data on a remote server/computer','Can store data locally on HDD or SSD'],
      ]},
    }),
  ];
}

function topic21Opening():LessonPresentationBeat[] {
  return [
    authoredStaticScene('h2p-21-hook','h2-211-arpanet-lan-wan','hook','2.1 · STARTER','A network is more than connected computers. What else must work?',[29,30],{
      lead:'The chapter builds networking from scope and infrastructure to models, topologies, transmission media, devices, Ethernet and streaming.',
    }),
    authoredStaticScene('h2p-21-objectives','h2-overview','objective','2.1 · LESSON GOALS','By the end of 2.1 you should be able to…',[27],{
      bullets:['Explain LAN/WAN characteristics, networking benefits and required infrastructure.','Compare client-server and peer-to-peer models, including thin and thick clients.','Select bus, star, mesh or hybrid topologies and compare cloud, wired and wireless choices.','Explain network-device functions, Ethernet collision handling and bit streaming.'],
    }),
  ];
}

function topic22Opening():LessonPresentationBeat[] {
  return [
    authoredStaticScene('h2p-22-hook','h2-221-internet','hook','2.2 · STARTER','You type a URL and press Enter. Which systems must cooperate before the page appears?',[54,62],{
      lead:'The route crosses internet infrastructure, addressing and name resolution before a browser can request and display the resource.',
    }),
    authoredStaticScene('h2p-22-objectives','h2-overview','objective','2.2 · LESSON GOALS','By the end of 2.2 you should be able to…',[27],{
      bullets:['Distinguish the internet from the World Wide Web and describe internet-access hardware.','Explain PSTN/VoIP and compare relevant communication infrastructure.','Interpret IPv4/IPv6 addressing, CIDR, zero compression, sub-netting and private/public addresses.','Decompose URLs, trace DNS lookup and distinguish client-side JavaScript from server-side PHP.'],
    }),
  ];
}

function internetWebComparison():LessonPresentationBeat {
  return authoredStaticScene('h2p-221-internet-web-compare','h2-221-comparison','compare','2.2.1 · INTERNET VS WWW','Infrastructure and information service are not the same thing',[54,55],{
    richBlock:{kind:'comparison',leftTitle:'Internet',rightTitle:'World Wide Web',rows:[
      ['Massive network of networks made up of computers and electronic devices','Collection of multimedia web pages and documents stored on websites'],
      ['Uses TCP/IP communication protocols','Uses the internet to access information from servers and other computers'],
      ['Carries many forms of network communication','Web resources are located with URLs and accessed using a web browser'],
    ]},
  });
}

function ipv6Benefits():LessonPresentationBeat {
  return authoredStaticScene('h2p-223-ipv6-benefits','h2-223-ipv6','concept','2.2.3 · WHY IPV6?','The coursebook gives four benefits over IPv4',[58],{
    bullets:['No need for NATs (network address translation).','Removes risk of private IP address collisions.','Has built-in authentication.','Allows more efficient routing.'],
  });
}

export function chapter2PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return buildAuthoredStoryboard(slides,OVERVIEW);

  if(topicCode==='2.1'){
    const result=[
      ...topic21Opening(),
      ...buildAuthoredStoryboard(slides,TOPIC_21_BEFORE_CLIENTS),
      ...thinThickScenes(),
      ...buildAuthoredStoryboard(slides,TOPIC_21_AFTER_CLIENTS),
    ];
    result.push(authoredStaticScene('h2p-21-recap','h2-activity-2b','recap','2.1 · RETRIEVAL','Rebuild the networking route without notes',[29,53],{
      bullets:['Scale and infrastructure: PAN/LAN/MAN/WAN plus hardware, software and services.','Models and layouts: client-server/P2P, thin/thick clients, bus/star/mesh/hybrid.','Media and devices: wired/wireless choices; hub, switch, bridge, router, gateway, modem, NIC/WNIC and repeater.','Transmission: Ethernet, collision handling with CSMA/CD, buffering, on-demand and real-time bit streaming.'],
    }));
    return result;
  }

  if(topicCode==='2.2'){
    const core=buildAuthoredStoryboard(slides,TOPIC_22);
    const internetIndex=core.findIndex(scene=>scene.id==='h2p-222-access-parts');
    if(internetIndex>=0)core.splice(internetIndex,0,internetWebComparison());
    const ipv6Index=core.findIndex(scene=>scene.id==='h2p-223-zero-compression');
    if(ipv6Index>=0)core.splice(ipv6Index,0,ipv6Benefits());
    return [
      ...topic22Opening(),
      ...core,
      authoredStaticScene('h2p-22-exam','h2-activity-2c','exam','2.2 · EXAM CHECK','Trace a web request from human-readable name to server connection',[54,64],{
        activity:{title:'Explain the route',prompt:'A user enters a URL in a browser. Explain the roles of the URL, DNS, IP address, ISP/internet connection and web server.',reveal:'The URL identifies the requested resource and domain. The browser asks DNS to resolve the domain name to an IP address. The device reaches the internet through its router/modem and ISP, then uses the resolved IP address to contact the web server and request the resource.'},
      }),
      authoredStaticScene('h2p-22-recap','h2-activity-2c','recap','2.2 · RETRIEVAL','What should you be able to reconstruct without the book?',[54,64],{
        bullets:['Internet vs WWW, internet-access components, PSTN/VoIP and satellite choices.','IPv4/IPv6 structure, CIDR, zero compression, sub-netting and private/public IP addresses.','URL components and the complete DNS lookup route.','HTML page structure and the distinction between client-side JavaScript and server-side PHP.'],
      }),
    ];
  }

  return null;
}
