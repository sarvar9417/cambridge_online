import type { CompareDeck } from './concept-compare-bank';

/** Hodder 9618 Chapters 1–8: additional concept comparisons.
 * Page numbers refer to the printed 2019 coursebook, not PDF viewer page numbers.
 * Statements are original formative practice paraphrases, not official MS extracts.
 * The chapter 1 section/page index is retained in the repository's Hodder source index.
 */
export const EARLY_CHAPTER_COMPARE_DECKS: CompareDeck[] = [
  // Chapter 1: Information representation
  {id:'binary-denary',chapterNo:1,a:'Binary',b:'Denary',pages:'2–7',sectionCodes:['1.1.1','1.1.2'],syllabusTopicCode:'1.1',cards:[
    ['Uses base two and the digits 0 and 1.','A'],['Uses base ten and the digits 0 through 9.','B'],
    ['Its place values are powers of two.','A'],['Its place values are powers of ten.','B'],
    ['1010 represents the denary value ten in this number system.','A'],
    ['The usual number system used when people write everyday quantities.','B'],
    ['Is a positional number system with place values.','AB'],['Can represent the same positive integer as the other system.','AB']
  ]},
  {id:'binary-hex',chapterNo:1,a:'Binary',b:'Hexadecimal',pages:'2–10',sectionCodes:['1.1.2','1.1.3'],syllabusTopicCode:'1.1',cards:[
    ['Represents each value with only the digits 0 and 1.','A'],['Uses the symbols 0–9 and A–F.','B'],
    ['A group of four digits is a nibble.','A'],['One digit represents the value of four binary bits.','B'],
    ['F represents the denary value fifteen in this system.','B'],['Has place values based on powers of two.','A'],
    ['Can represent the contents of computer memory.','AB'],['Can be converted to denary and back without changing the underlying value.','AB']
  ]},
  {id:'bcd-pure-binary',chapterNo:1,a:'Binary-coded decimal (BCD)',b:'Pure binary',pages:'10–12',sectionCodes:['1.1.4'],syllabusTopicCode:'1.1',cards:[
    ['Encodes each denary digit separately using four bits.','A'],['Encodes an entire integer as a base-two value.','B'],
    ['Denary 25 is encoded as 0010 0101.','A'],['Denary 25 is encoded as 11001.','B'],
    ['The bit patterns 1010 to 1111 are not valid individual decimal digits.','A'],
    ['Usually needs fewer bits for a given large integer than decimal-digit encoding.','B'],
    ['Uses bits containing only 0 and 1.','AB'],['Can be used to represent non-negative numerical data.','AB']
  ]},
  {id:'ascii-unicode',chapterNo:1,a:'ASCII',b:'Unicode',pages:'12–14',sectionCodes:['1.1.5'],syllabusTopicCode:'1.1',cards:[
    ['The original standard uses seven bits for 128 characters.','A'],
    ['Covers characters from many writing systems and symbol sets.','B'],
    ['Its basic 7-bit code cannot represent all world scripts.','A'],
    ['May be encoded as UTF-8, UTF-16 or UTF-32.','B'],
    ['The letter A has code value 65 in its basic Latin encoding.','AB'],
    ['Supports a much larger set of code points.','B'],
    ['Assigns numerical codes to textual characters.','AB'],
    ['Can be used for storing and transmitting text in computer systems.','AB']
  ]},
  {id:'bitmap-vector',chapterNo:1,a:'Bitmap image',b:'Vector graphic',pages:'15–19',sectionCodes:['1.2.1','1.2.2'],syllabusTopicCode:'1.2',cards:[
    ['Stores an image as a grid of individual pixels.','A'],['Stores shapes described using geometric objects and coordinates.','B'],
    ['Resolution is based on the number of pixels.','A'],['Can be enlarged without the pixelation of a raster image.','B'],
    ['Particularly suitable for detailed photographs.','A'],['Particularly suitable for logos and line drawings.','B'],
    ['Can represent a computer graphic on a screen.','AB'],['Can be saved and edited using graphics software.','AB']
  ]},
  {id:'sampling-rate-resolution',chapterNo:1,a:'Sampling rate',b:'Sampling resolution',pages:'19–20',sectionCodes:['1.2.3'],syllabusTopicCode:'1.2',cards:[
    ['Measures how many sound samples are taken per second.','A'],['Measures how many bits represent each audio sample.','B'],
    ['Normally measured in hertz (Hz).','A'],['Normally measured in bits per sample.','B'],
    ['Increasing it allows more frequent changes in a waveform to be captured.','A'],
    ['Increasing it allows more possible amplitude levels per sample.','B'],
    ['Can affect the fidelity of digitised sound.','AB'],['Increasing it generally increases uncompressed audio file size.','AB']
  ]},
  {id:'lossy-lossless',chapterNo:1,a:'Lossy compression',b:'Lossless compression',pages:'21–26',sectionCodes:['1.3.1','1.3.2'],syllabusTopicCode:'1.3',cards:[
    ['Discards some information to achieve file-size reduction.','A'],['Restores the original data exactly after decompression.','B'],
    ['May introduce visible or audible quality loss.','A'],['Necessary when every bit must be recovered unchanged.','B'],
    ['JPEG image compression is a common example.','A'],['PNG image compression is a common example.','B'],
    ['Reduces storage space or transmission requirements.','AB'],['Requires a method for encoding and decoding compressed data.','AB']
  ]},
  {id:'rle-huffman',chapterNo:1,a:'Run-length encoding (RLE)',b:'Huffman coding',pages:'24–26',sectionCodes:['1.3.2'],syllabusTopicCode:'1.3',cards:[
    ['Replaces consecutive identical values with a value and a count.','A'],
    ['Assigns shorter codes to more frequent symbols.','B'],
    ['Works particularly well for long repeated runs of the same colour.','A'],
    ['Uses a variable-length prefix-free code for symbols.','B'],
    ['Can be ineffective when neighbouring values rarely repeat.','A'],
    ['Requires a code table or tree to decode the bit stream.','B'],
    ['Is a lossless compression method.','AB'],['Allows the original sequence to be reconstructed exactly.','AB']
  ]},

  // Chapter 2: Communication
  {id:'thin-thick-client',chapterNo:2,a:'Thin client',b:'Thick client',pages:'33–36',sectionCodes:['2.1.2'],syllabusTopicCode:'2.1',cards:[
    ['Relies heavily on a server for processing and application services.','A'],
    ['Performs more application processing on its own computer.','B'],
    ['May have relatively modest local computing specifications.','A'],
    ['Can often continue local work when the server connection is interrupted.','B'],
    ['Typically needs a reliable network connection to use central applications.','A'],
    ['Usually requires more capable local hardware.','B'],
    ['Can act as a client in a client-server network.','AB'],['Can be managed and secured by an organisation.','AB']
  ]},
  {id:'bus-star',chapterNo:2,a:'Bus topology',b:'Star topology',pages:'36–39',sectionCodes:['2.1.3'],syllabusTopicCode:'2.1',cards:[
    ['All nodes share one main backbone cable.','A'],['Each node connects to a central networking device.','B'],
    ['A backbone cable failure can interrupt the whole network.','A'],
    ['Failure of one end-device cable usually affects only that device.','B'],
    ['Uses terminators at the ends of the shared cable in traditional designs.','A'],
    ['Failure of the central switch can affect all attached devices.','B'],
    ['Describes the physical or logical arrangement of a network.','AB'],
    ['Enables devices to exchange data when correctly configured.','AB']
  ]},
  {id:'star-mesh',chapterNo:2,a:'Star topology',b:'Mesh topology',pages:'36–39',sectionCodes:['2.1.3'],syllabusTopicCode:'2.1',cards:[
    ['Devices connect through a central switch or hub.','A'],
    ['Devices have multiple interconnections that can provide alternative paths.','B'],
    ['A central switch is a single point of failure.','A'],
    ['Redundant links can help the network survive individual link failures.','B'],
    ['Usually needs fewer cables than a fully connected mesh.','A'],
    ['Can become costly and complex when every device is connected to every other.','B'],
    ['Is a way of arranging connections between network devices.','AB'],
    ['May be used to connect computers in an organisation.','AB']
  ]},
  {id:'public-private-cloud',chapterNo:2,a:'Public cloud',b:'Private cloud',pages:'39–41',sectionCodes:['2.1.4'],syllabusTopicCode:'2.1',cards:[
    ['Cloud resources are offered to multiple customers by a provider.','A'],
    ['Cloud infrastructure is dedicated to one organisation.','B'],
    ['Shared infrastructure can reduce the cost of provisioning resources.','A'],
    ['The organisation can exercise greater control over its dedicated environment.','B'],
    ['Customers usually rent resources on the provider’s terms.','A'],
    ['May require greater organisational investment in management.','B'],
    ['Can offer remotely accessed computing or storage services.','AB'],
    ['Must address availability and data-security requirements.','AB']
  ]},
  {id:'wired-wireless',chapterNo:2,a:'Wired network',b:'Wireless network',pages:'41–45',sectionCodes:['2.1.5'],syllabusTopicCode:'2.1',cards:[
    ['Uses physical cables to carry communication signals.','A'],
    ['Uses radio waves or other wireless signals between devices.','B'],
    ['Usually provides a stable link with less radio interference.','A'],
    ['Allows devices to move without maintaining a cable connection.','B'],
    ['Cable installation can be disruptive or expensive.','A'],
    ['Signal quality can be affected by walls and radio interference.','B'],
    ['Can connect computers to a local area network.','AB'],
    ['Needs suitable network interfaces and security measures.','AB']
  ]},
  {id:'copper-fibre',chapterNo:2,a:'Copper cable',b:'Fibre-optic cable',pages:'41–47',sectionCodes:['2.1.5','2.1.6'],syllabusTopicCode:'2.1',cards:[
    ['Carries electrical signals through metal conductors.','A'],
    ['Carries information as pulses of light through glass or plastic fibres.','B'],
    ['Can be affected by electromagnetic interference.','A'],
    ['Is immune to electromagnetic interference along the optical medium.','B'],
    ['Twisted-pair Ethernet cable is one example.','A'],
    ['Can support high bandwidth over long distances with low attenuation.','B'],
    ['Is a guided physical transmission medium.','AB'],
    ['Can be used to connect network equipment.','AB']
  ]},
  {id:'ethernet-wifi',chapterNo:2,a:'Wired Ethernet',b:'Wi-Fi',pages:'45–52',sectionCodes:['2.1.6','2.1.7'],syllabusTopicCode:'2.1',cards:[
    ['Commonly uses cables and switches to link devices in a LAN.','A'],
    ['Commonly uses wireless access points and radio signals.','B'],
    ['Traditional shared-medium versions use CSMA/CD to detect collisions.','A'],
    ['Uses wireless medium-access mechanisms designed to reduce collisions.','B'],
    ['Provides fixed-port connections to a switch.','A'],
    ['Allows a mobile device to stay connected without an Ethernet cable.','B'],
    ['Connects devices using network frames and hardware addresses.','AB'],
    ['Supports exchanging data inside a local network.','AB']
  ]},
  {id:'live-on-demand-stream',chapterNo:2,a:'Live/real-time streaming',b:'On-demand streaming',pages:'52–54',sectionCodes:['2.1.8'],syllabusTopicCode:'2.1',cards:[
    ['Distributes an event as it happens.','A'],['Lets a viewer choose when to begin a pre-recorded item.','B'],
    ['A live sports broadcast is a typical example.','A'],
    ['Selecting an archived film from a streaming library is an example.','B'],
    ['Delays caused by buffering can make the audience fall behind the event.','A'],
    ['A viewer can normally pause and restart stored content independently.','B'],
    ['Transfers media data over a network for playback.','AB'],
    ['Can use buffering to cope with network fluctuations.','AB']
  ]},
  {id:'internet-www',chapterNo:2,a:'Internet',b:'World Wide Web (WWW)',pages:'54–57',sectionCodes:['2.2.1','2.2.2'],syllabusTopicCode:'2.1',cards:[
    ['The global network of interconnected computer networks.','A'],
    ['A collection of linked web resources accessed through browsers.','B'],
    ['Provides infrastructure for email, file transfer and many other services.','A'],
    ['Uses web pages, hyperlinks and web servers.','B'],
    ['Uses IP to route packets across interconnected networks.','A'],
    ['Typically uses HTTP or HTTPS to retrieve web content.','B'],
    ['Enables information to be accessed from distant devices.','AB'],
    ['Depends on connected computing and networking equipment.','AB']
  ]},
  {id:'ipv4-ipv6',chapterNo:2,a:'IPv4',b:'IPv6',pages:'57–60',sectionCodes:['2.2.3'],syllabusTopicCode:'2.1',cards:[
    ['Uses a 32-bit address.','A'],['Uses a 128-bit address.','B'],
    ['Often written as four decimal octets separated by dots.','A'],
    ['Usually written as hexadecimal groups separated by colons.','B'],
    ['192.168.1.10 has the expected address notation.','A'],
    ['2001:db8::1 has the expected address notation.','B'],
    ['Identifies interfaces for routing packets between IP networks.','AB'],
    ['Can be assigned to a device that communicates over the internet.','AB']
  ]},
  {id:'public-private-ip',chapterNo:2,a:'Public IP address',b:'Private IP address',pages:'57–61',sectionCodes:['2.2.3'],syllabusTopicCode:'2.1',cards:[
    ['Designed to be globally routable on the public internet.','A'],
    ['Used within private networks and not routed directly over the public internet.','B'],
    ['Often assigned to an organisation or connection by an ISP.','A'],
    ['192.168.1.5 is a typical example.','B'],
    ['Needs to be globally unique for unambiguous public routing.','A'],
    ['May be reused independently in different home networks.','B'],
    ['Identifies a network interface using the IP protocol.','AB'],
    ['Can participate in communication through a router.','AB']
  ]},
  {id:'url-dns',chapterNo:2,a:'URL',b:'Domain Name System (DNS)',pages:'61–63',sectionCodes:['2.2.4','2.2.5'],syllabusTopicCode:'2.1',cards:[
    ['Specifies the address or location of a web resource.','A'],
    ['Resolves domain names to associated IP addresses.','B'],
    ['May contain a scheme, host name, path and query.','A'],
    ['Uses distributed name servers and DNS records.','B'],
    ['https://example.org/page is a valid example.','A'],
    ['Can return an A or AAAA record for a hostname.','B'],
    ['Supports locating online services or resources.','AB'],
    ['May involve a human-readable domain name.','AB']
  ]},

  // Chapter 3: Hardware
  {id:'ram-rom',chapterNo:3,a:'RAM',b:'ROM',pages:'68–72',sectionCodes:['3.1.1'],syllabusTopicCode:'3.1',cards:[
    ['Normally holds working data and programs that change during operation.','A'],
    ['Typically stores firmware needed when a device starts.','B'],
    ['Ordinary main-memory contents are lost when power is removed.','A'],
    ['Retains its stored contents without power.','B'],
    ['Can be written to frequently while applications execute.','A'],
    ['Its intended contents are usually changed infrequently.','B'],
    ['Can be addressed by a processor.','AB'],['Is a type of primary memory.','AB']
  ]},
  {id:'prom-eprom',chapterNo:3,a:'PROM',b:'EPROM',pages:'70–72',sectionCodes:['3.1.1'],syllabusTopicCode:'3.1',cards:[
    ['Can be programmed once after manufacture.','A'],
    ['Can be erased using ultraviolet light and reprogrammed.','B'],
    ['A failed initial programming cannot normally be undone.','A'],
    ['Commonly needs a special erasing procedure before being rewritten.','B'],
    ['Once programmed, its contents are not changed by ordinary software writes.','A'],
    ['Can be reused after erasure if the hardware supports reprogramming.','B'],
    ['Is non-volatile memory.','AB'],['Can be used to store relatively permanent instructions or data.','AB']
  ]},
  {id:'primary-secondary',chapterNo:3,a:'Primary memory',b:'Secondary storage',pages:'68–76',sectionCodes:['3.1.1'],syllabusTopicCode:'3.1',cards:[
    ['Includes RAM directly accessible during CPU operation.','A'],
    ['Includes HDDs, SSDs and optical discs used for persistent files.','B'],
    ['Usually provides rapid working access for running programs.','A'],
    ['Often holds an operating system and user files when switched off.','B'],
    ['Typically has lower capacity than a computer’s mass-storage drive.','A'],
    ['Usually provides more capacity at lower cost per bit than main memory.','B'],
    ['Stores data as part of a computer system.','AB'],
    ['Can affect the speed and usefulness of the system.','AB']
  ]},
  {id:'magnetic-optical',chapterNo:3,a:'Magnetic storage',b:'Optical storage',pages:'72–76',sectionCodes:['3.1.1'],syllabusTopicCode:'3.1',cards:[
    ['Hard disk platters and magnetic tape are common examples.','A'],
    ['CD, DVD and Blu-ray discs are examples.','B'],
    ['Uses changes in magnetic orientation to store bits.','A'],
    ['Uses a laser to read patterns on a disc surface.','B'],
    ['Magnetic tape is often used for high-volume archival backups.','A'],
    ['Disc formats may be read-only, write-once or rewritable.','B'],
    ['Is a form of secondary storage.','AB'],['Can preserve data without continuous electrical power.','AB']
  ]},
  {id:'input-output',chapterNo:3,a:'Input device',b:'Output device',pages:'77–89',sectionCodes:['3.1.2'],syllabusTopicCode:'3.1',cards:[
    ['Sends data or commands into a computer.','A'],['Presents processed information to a person or another device.','B'],
    ['A keyboard or barcode reader is a typical example.','A'],
    ['A monitor or printer is a typical example.','B'],
    ['A sensor can supply measurements to a control system.','A'],
    ['An actuator can carry out a physical action commanded by the system.','B'],
    ['Is a hardware component attached to a computer system.','AB'],
    ['Can communicate through an interface or port.','AB']
  ]},
  {id:'monitoring-control',chapterNo:3,a:'Monitoring system',b:'Control system',pages:'81–89',sectionCodes:['3.1.2'],syllabusTopicCode:'3.1',cards:[
    ['Collects sensor readings for observation and recording.','A'],
    ['Uses sensor readings to decide and carry out actions.','B'],
    ['May sound an alarm when a measured value is abnormal.','A'],
    ['Can alter a heater or motor through an actuator.','B'],
    ['A weather station that logs temperature is an example.','A'],
    ['A thermostat that adjusts heating is an example.','B'],
    ['Can use sensors and a processor.','AB'],
    ['Can compare measured values against preset limits.','AB']
  ]},
  {id:'and-or-gates',chapterNo:3,a:'AND gate',b:'OR gate',pages:'89–94',sectionCodes:['3.2.1','3.2.2','3.2.3','3.2.4'],syllabusTopicCode:'3.2',cards:[
    ['Outputs 1 only if every input is 1.','A'],
    ['Outputs 1 if at least one input is 1.','B'],
    ['For inputs 1 and 0, its output is 0.','A'],
    ['For inputs 1 and 0, its output is 1.','B'],
    ['For inputs 0 and 0, its output is 0.','AB'],
    ['For inputs 1 and 1, its output is 1.','AB'],
    ['Implements the Boolean operation of logical conjunction.','A'],
    ['Implements the Boolean operation of logical disjunction.','B']
  ]},
  {id:'nand-nor-gates',chapterNo:3,a:'NAND gate',b:'NOR gate',pages:'89–101',sectionCodes:['3.2.3','3.2.4','3.2.5','3.2.6'],syllabusTopicCode:'3.2',cards:[
    ['Is equivalent to an AND gate followed by NOT.','A'],
    ['Is equivalent to an OR gate followed by NOT.','B'],
    ['Outputs 0 only when all inputs are 1.','A'],
    ['Outputs 1 only when all inputs are 0.','B'],
    ['For two inputs 0 and 1, outputs 1.','A'],
    ['For two inputs 0 and 1, outputs 0.','B'],
    ['Can be combined to construct other logic functions.','AB'],
    ['Has an inverted output compared with a basic logic gate.','AB']
  ]},
  {id:'xor-or-gates',chapterNo:3,a:'XOR gate',b:'OR gate',pages:'89–101',sectionCodes:['3.2.3','3.2.4','3.2.5'],syllabusTopicCode:'3.2',cards:[
    ['For two inputs, outputs 1 when the inputs differ.','A'],
    ['Outputs 1 when at least one input is 1.','B'],
    ['For two inputs 1 and 1, its output is 0.','A'],
    ['For two inputs 1 and 1, its output is 1.','B'],
    ['For two inputs 1 and 0, outputs 1.','AB'],
    ['For two inputs 0 and 0, outputs 0.','AB'],
    ['Can be used in circuits that test whether two bits are different.','A'],
    ['Can be used in circuits where either condition should trigger an output.','B']
  ]},

  // Chapter 4: Processor fundamentals
  {id:'alu-cu',chapterNo:4,a:'Arithmetic Logic Unit (ALU)',b:'Control Unit (CU)',pages:'109–112',sectionCodes:['4.1.1','4.1.2'],syllabusTopicCode:'4.1',cards:[
    ['Performs arithmetic calculations and logic comparisons.','A'],
    ['Decodes instructions and coordinates processor operations.','B'],
    ['May calculate a sum or perform a bitwise AND.','A'],
    ['Sends control signals to coordinate data movement.','B'],
    ['Can update status flags based on an operation result.','A'],
    ['Controls the sequence of steps in the fetch-execute cycle.','B'],
    ['Is a component of the CPU.','AB'],
    ['Works with registers during instruction execution.','AB']
  ]},
  {id:'pc-cir',chapterNo:4,a:'Program Counter (PC)',b:'Current Instruction Register (CIR)',pages:'110–117',sectionCodes:['4.1.3','4.1.6'],syllabusTopicCode:'4.1',cards:[
    ['Holds the address of the next instruction to fetch.','A'],
    ['Holds the instruction currently being decoded or executed.','B'],
    ['Normally advances to the next instruction address during fetching.','A'],
    ['Supplies instruction bits for decoding.','B'],
    ['May change to a new address when a branch is taken.','A'],
    ['Receives the fetched instruction from the data path.','B'],
    ['Is a special-purpose CPU register.','AB'],
    ['Is used during the fetch-execute cycle.','AB']
  ]},
  {id:'address-data-bus',chapterNo:4,a:'Address bus',b:'Data bus',pages:'112–114',sectionCodes:['4.1.4'],syllabusTopicCode:'4.1',cards:[
    ['Carries the location of a memory address.','A'],
    ['Carries values being transferred between components.','B'],
    ['Normally carries addresses from the CPU toward memory or I/O.','A'],
    ['Supports two-way transfer of read and written data.','B'],
    ['Its width affects the directly addressable memory space.','A'],
    ['Its width affects how many data bits can transfer at one time.','B'],
    ['Is a set of connections in the system bus.','AB'],
    ['Connects the processor with other hardware components.','AB']
  ]},
  {id:'usb-hdmi',chapterNo:4,a:'USB',b:'HDMI',pages:'114–116',sectionCodes:['4.1.5'],syllabusTopicCode:'4.1',cards:[
    ['Commonly connects keyboards, mice and external drives.','A'],
    ['Designed for digital video and audio connections to displays.','B'],
    ['Can transfer data and supply electrical power to peripherals.','A'],
    ['Often connects a computer to a monitor or television.','B'],
    ['Commonly supports plugging in general-purpose peripherals.','A'],
    ['Carries high-definition multimedia signals in one connection.','B'],
    ['Is an external connection standard used by computers.','AB'],
    ['Uses physical ports and cables in a typical wired setup.','AB']
  ]},
  {id:'hardware-software-interrupt',chapterNo:4,a:'Hardware interrupt',b:'Software interrupt',pages:'119–121',sectionCodes:['4.1.7'],syllabusTopicCode:'4.1',cards:[
    ['Triggered by an external hardware event such as a key press.','A'],
    ['Triggered by executing a software instruction or system call.','B'],
    ['Can originate from an input/output device signalling the CPU.','A'],
    ['Can be deliberately invoked by a running program.','B'],
    ['A timer event may cause this type of interrupt.','A'],
    ['A request for an operating-system service may use this type.','B'],
    ['Transfers control to an interrupt-handling routine.','AB'],
    ['May require preserving the current program state before handling.','AB']
  ]},
  {id:'assembly-machine-code',chapterNo:4,a:'Assembly language',b:'Machine code',pages:'121–124',sectionCodes:['4.2.1','4.2.3'],syllabusTopicCode:'4.2',cards:[
    ['Uses mnemonic operation names and symbolic operands.','A'],
    ['Uses binary instruction patterns executed directly by the processor.','B'],
    ['Needs an assembler to translate its source statements.','A'],
    ['Is the processor’s directly executable instruction representation.','B'],
    ['A programmer may write ADD or LDA mnemonics.','A'],
    ['Instruction bits specify opcodes and operand information.','B'],
    ['Is a low-level representation of processor instructions.','AB'],
    ['Depends on the instruction set of a target processor.','AB']
  ]},
  {id:'assembler-pass1-pass2',chapterNo:4,a:'Assembler pass one',b:'Assembler pass two',pages:'122–124',sectionCodes:['4.2.2'],syllabusTopicCode:'4.2',cards:[
    ['Builds a symbol table of labels and their addresses.','A'],
    ['Uses resolved symbol addresses to generate object code.','B'],
    ['Assigns addresses to instructions and data declarations.','A'],
    ['Resolves forward references using information collected earlier.','B'],
    ['Can identify duplicate labels during initial source analysis.','A'],
    ['Completes translation of mnemonics and operands into instruction encoding.','B'],
    ['Is part of translating assembly source into machine code.','AB'],
    ['Processes assembly-language source information.','AB']
  ]},
  {id:'immediate-direct-address',chapterNo:4,a:'Immediate addressing',b:'Direct addressing',pages:'125–127',sectionCodes:['4.2.4','4.2.5'],syllabusTopicCode:'4.2',cards:[
    ['The operand contains the actual constant value to use.','A'],
    ['The operand specifies the memory address of the value.','B'],
    ['A constant such as #5 is supplied inside the instruction.','A'],
    ['The CPU reads data from the specified memory location.','B'],
    ['No separate memory read is needed to obtain a literal operand.','A'],
    ['An address field names the location containing the operand.','B'],
    ['Is an assembly-language addressing mode.','AB'],
    ['Specifies how an instruction obtains its operand.','AB']
  ]},
  {id:'indirect-indexed-address',chapterNo:4,a:'Indirect addressing',b:'Indexed addressing',pages:'125–127',sectionCodes:['4.2.4','4.2.5'],syllabusTopicCode:'4.2',cards:[
    ['An indicated memory location contains the address of the required data.','A'],
    ['An effective address is calculated by adding an index value to an address.','B'],
    ['Requires following a pointer to locate the operand.','A'],
    ['Often useful for stepping through array elements.','B'],
    ['A change in the stored pointer can redirect access.','A'],
    ['An index register can select an offset within a data structure.','B'],
    ['Is an addressing mode used in assembly code.','AB'],
    ['Can be used to access data in memory.','AB']
  ]},
  {id:'logical-arithmetic-shift',chapterNo:4,a:'Logical right shift',b:'Arithmetic right shift',pages:'130–132',sectionCodes:['4.3.1','4.3.2'],syllabusTopicCode:'4.3',cards:[
    ['Shifts bits right and fills new left positions with zeros.','A'],
    ['Shifts bits right and copies the original sign bit into left positions.','B'],
    ['Does not preserve the sign of a negative two’s-complement number.','A'],
    ['Can preserve the sign during signed division by powers of two.','B'],
    ['On 1000 (four bits), shifting once gives 0100.','A'],
    ['On signed four-bit 1000, shifting once gives 1100.','B'],
    ['Moves bit positions towards the least significant end.','AB'],
    ['Can discard bits shifted beyond the right edge.','AB']
  ]},
  {id:'cyclic-logical-shift',chapterNo:4,a:'Cyclic right shift',b:'Logical right shift',pages:'130–132',sectionCodes:['4.3.1'],syllabusTopicCode:'4.3',cards:[
    ['Wraps the bit shifted out of the right edge back into the left edge.','A'],
    ['Inserts a zero bit into the left edge.','B'],
    ['On 1001 (four bits), shifting right once gives 1100.','A'],
    ['On 1001 (four bits), shifting right once gives 0100.','B'],
    ['Preserves all the original bits by rotating their positions.','A'],
    ['May permanently discard the least significant bit.','B'],
    ['Changes the positions of bits in a binary word.','AB'],
    ['Can be performed using processor shift instructions.','AB']
  ]},
  {id:'set-clear-mask',chapterNo:4,a:'Setting a bit using OR',b:'Clearing a bit using AND',pages:'131–135',sectionCodes:['4.3.2'],syllabusTopicCode:'4.3',cards:[
    ['Combines the data word with a mask containing a 1 at the target position.','A'],
    ['Combines the data word with a mask containing a 0 at the target position.','B'],
    ['Makes a selected control flag equal to 1 without changing other bits.','A'],
    ['Makes a selected control flag equal to 0 without changing other bits.','B'],
    ['For 0100 OR 0001 the result is 0101.','A'],
    ['For 0101 AND 1110 the result is 0100.','B'],
    ['Is a bit manipulation technique that can control device flags.','AB'],
    ['Can preserve bits at positions other than the selected target.','AB']
  ]},

  // Chapter 5: System software
  {id:'os-utility-software',chapterNo:5,a:'Operating system',b:'Utility software',pages:'136–147',sectionCodes:['5.1.1','5.1.2','5.1.3'],syllabusTopicCode:'5.1',cards:[
    ['Manages memory, processes, files and devices for running programs.','A'],
    ['Performs specific maintenance, protection or optimisation tasks.','B'],
    ['Schedules CPU time between runnable processes.','A'],
    ['A virus checker or file-compression tool is an example.','B'],
    ['Provides fundamental services for application programs.','A'],
    ['Can scan a disk for errors or make backups.','B'],
    ['Is a category of system software.','AB'],
    ['Helps a computer operate effectively.','AB']
  ]},
  {id:'gui-cli',chapterNo:5,a:'Graphical user interface (GUI)',b:'Command-line interface (CLI)',pages:'137–141',sectionCodes:['5.1.1','5.1.2'],syllabusTopicCode:'5.1',cards:[
    ['Usually uses windows, icons, menus and pointing devices.','A'],
    ['Requires the user to type commands with correct syntax.','B'],
    ['Can be easier for beginners to discover available actions.','A'],
    ['Can automate repeated commands with scripts.','B'],
    ['Usually needs more graphical resources than a simple text terminal.','A'],
    ['Can be effective over low-bandwidth remote terminal connections.','B'],
    ['Provides a means for a user to communicate with a computer.','AB'],
    ['Can be supplied by an operating system.','AB']
  ]},
  {id:'memory-process-management',chapterNo:5,a:'Memory management',b:'Process management',pages:'139–143',sectionCodes:['5.1.2'],syllabusTopicCode:'5.1',cards:[
    ['Allocates and releases memory space for programs.','A'],
    ['Schedules tasks or processes for execution by the CPU.','B'],
    ['Helps prevent one program from overwriting another’s memory.','A'],
    ['Handles process states and switching between running tasks.','B'],
    ['Keeps track of which regions of RAM are in use.','A'],
    ['Decides which ready process receives processor time.','B'],
    ['Is a core operating-system responsibility.','AB'],
    ['Helps multiple applications operate reliably.','AB']
  ]},
  {id:'defrag-compress',chapterNo:5,a:'Disk defragmentation',b:'File compression',pages:'143–146',sectionCodes:['5.1.3'],syllabusTopicCode:'5.1',cards:[
    ['Reorganises fragmented file blocks on a magnetic disk.','A'],
    ['Encodes a file using fewer bits where possible.','B'],
    ['Aims to reduce mechanical seek overhead on a hard disk.','A'],
    ['Aims to reduce space used to store or send a file.','B'],
    ['Does not normally change the file’s logical contents or size.','A'],
    ['May need decompression before the original data is used.','B'],
    ['Is a maintenance or support utility task.','AB'],
    ['Can be used to improve use of storage resources.','AB']
  ]},
  {id:'static-dynamic-library',chapterNo:5,a:'Static linking',b:'Dynamic linking (DLL)',pages:'147–149',sectionCodes:['5.1.4'],syllabusTopicCode:'5.1',cards:[
    ['Copies needed library code into an executable during the build.','A'],
    ['Loads or resolves library code separately when a program runs.','B'],
    ['Can produce a larger self-contained executable.','A'],
    ['Allows several applications to share one installed library copy.','B'],
    ['The linked code is normally fixed inside the program until rebuilt.','A'],
    ['A missing required shared library may prevent the program from starting.','B'],
    ['Lets programmers reuse prewritten routines.','AB'],
    ['Provides a way to incorporate library functions into applications.','AB']
  ]},
  {id:'assembler-compiler',chapterNo:5,a:'Assembler',b:'Compiler',pages:'149–152',sectionCodes:['5.2.1','5.2.2'],syllabusTopicCode:'5.2',cards:[
    ['Translates assembly mnemonics into machine instructions.','A'],
    ['Translates a high-level source program into lower-level code.','B'],
    ['Typically handles one mnemonic instruction per target instruction.','A'],
    ['Can perform optimisation across high-level language statements.','B'],
    ['Resolves symbolic labels in assembly source.','A'],
    ['Checks the syntax and semantics of constructs in a high-level language.','B'],
    ['Is a type of language translator.','AB'],
    ['Reports translation errors found in source code.','AB']
  ]},
  {id:'bytecode-machinecode',chapterNo:5,a:'Bytecode',b:'Native machine code',pages:'152–153',sectionCodes:['5.2.3'],syllabusTopicCode:'5.2',cards:[
    ['Can be an intermediate output of a partly compiled high-level program.','A'],
    ['Contains instruction encodings that a particular physical CPU executes directly.','B'],
    ['May be interpreted or compiled at run time by a virtual machine.','A'],
    ['Is specific to the instruction set architecture of the processor.','B'],
    ['Java source is commonly compiled to this platform-independent intermediate form.','A'],
    ['A processor can fetch and execute this native instruction format.','B'],
    ['Is a lower-level representation of program instructions.','AB'],
    ['Can be produced during language translation.','AB']
  ]},
  {id:'breakpoint-single-step',chapterNo:5,a:'Breakpoint',b:'Single stepping',pages:'153–158',sectionCodes:['5.2.4'],syllabusTopicCode:'5.2',cards:[
    ['Stops program execution automatically at a chosen location.','A'],
    ['Runs one instruction or statement at a time under debugger control.','B'],
    ['Useful when execution should pause only after reaching a suspected fault.','A'],
    ['Useful for following changes to variables line by line.','B'],
    ['Can be attached to a specific source-code line or condition.','A'],
    ['Requires the programmer to advance execution in small steps.','B'],
    ['Is a feature of debugging tools in an IDE.','AB'],
    ['Can help locate the cause of an error in a running program.','AB']
  ]},

  // Chapter 6: Security, privacy and data integrity
  {id:'authentication-authorisation',chapterNo:6,a:'Authentication',b:'Authorisation',pages:'159–164',sectionCodes:['6.1.1','6.1.2'],syllabusTopicCode:'6.1',cards:[
    ['Checks whether a user is who they claim to be.','A'],
    ['Decides what an identified user is permitted to access.','B'],
    ['A password or biometric login may provide evidence.','A'],
    ['A read-only role controls permitted file operations.','B'],
    ['Usually takes place before access permissions are applied.','A'],
    ['Can restrict a student from editing administrator records.','B'],
    ['Helps protect a computer system and its data.','AB'],
    ['Can be managed using user accounts.','AB']
  ]},
  {id:'firewall-antivirus',chapterNo:6,a:'Firewall',b:'Antivirus software',pages:'160–168',sectionCodes:['6.1.2','6.1.3'],syllabusTopicCode:'6.1',cards:[
    ['Filters network traffic against rules about permitted connections.','A'],
    ['Scans for and responds to malicious software.','B'],
    ['Can block an incoming connection on a disallowed port.','A'],
    ['Can quarantine a detected infected file.','B'],
    ['Operates at a boundary between networks or on an individual host.','A'],
    ['Can use signatures or behaviour analysis to identify threats.','B'],
    ['Is used to improve computer security.','AB'],
    ['Needs suitable configuration and updates to remain effective.','AB']
  ]},
  {id:'virus-spyware',chapterNo:6,a:'Computer virus',b:'Spyware',pages:'164–168',sectionCodes:['6.1.3'],syllabusTopicCode:'6.1',cards:[
    ['Attaches to a host file or program and can replicate when run.','A'],
    ['Secretly collects information about the user or device.','B'],
    ['May spread by infecting other executable files.','A'],
    ['May record keystrokes or browsing activity.','B'],
    ['Can corrupt programs or data as part of its payload.','A'],
    ['Primarily threatens confidentiality through covert monitoring.','B'],
    ['Is a form of malicious software.','AB'],
    ['Can be detected or blocked by suitable protective tools.','AB']
  ]},
  {id:'backup-archive',chapterNo:6,a:'Backup',b:'Archive',pages:'167–169',sectionCodes:['6.1.4'],syllabusTopicCode:'6.1',cards:[
    ['Creates an extra copy so data can be restored after loss or corruption.','A'],
    ['Moves infrequently used information to long-term retention storage.','B'],
    ['Often contains recent versions of active files.','A'],
    ['Often contains older records kept for legal or historical reasons.','B'],
    ['Restoration after accidental deletion is a primary purpose.','A'],
    ['Reducing the amount of inactive data in primary storage is a common purpose.','B'],
    ['Can preserve data for later retrieval.','AB'],
    ['Requires appropriate security and retention procedures.','AB']
  ]},
  {id:'range-check-format-check',chapterNo:6,a:'Range check',b:'Format check',pages:'169–172',sectionCodes:['6.2.1'],syllabusTopicCode:'6.2',cards:[
    ['Tests whether a value falls between allowed limits.','A'],
    ['Tests whether an entry matches a prescribed pattern.','B'],
    ['Accepting an age from 0 to 120 is an example.','A'],
    ['Checking that a code has two letters followed by three digits is an example.','B'],
    ['May reject a number that is too high or too low.','A'],
    ['May reject characters in the wrong positions.','B'],
    ['Is a method of validating input data.','AB'],
    ['Cannot by itself prove that a supplied value is factually correct.','AB']
  ]},

  // Chapter 7: Ethics and ownership
  {id:'ethics-law',chapterNo:7,a:'Ethical obligation',b:'Legal obligation',pages:'179–186',sectionCodes:['7.1.1','7.1.2','7.1.3'],syllabusTopicCode:'7.1',cards:[
    ['Concerns responsible conduct guided by moral or professional principles.','A'],
    ['Concerns requirements imposed by enforceable legislation.','B'],
    ['May demand more responsible conduct than the minimum required by law.','A'],
    ['A court can impose penalties for breaching applicable legislation.','B'],
    ['Professional codes of conduct can describe the expected behaviour.','A'],
    ['Statutes and regulations formally define what is prohibited or required.','B'],
    ['Can affect decisions made by computing professionals.','AB'],
    ['Can influence how people handle personal data and intellectual property.','AB']
  ]},
  {id:'copyright-plagiarism',chapterNo:7,a:'Copyright infringement',b:'Plagiarism',pages:'186–189',sectionCodes:['7.2.1','7.2.2'],syllabusTopicCode:'7.1',cards:[
    ['Uses copyright-protected material in a way that breaches the owner’s exclusive rights.','A'],
    ['Presents another person’s ideas or work as one’s own without attribution.','B'],
    ['Can occur even when the copied material is clearly attributed.','A'],
    ['Can occur with ideas or words whose copyright protection has expired.','B'],
    ['Licensing terms and copyright exceptions affect whether an act is unlawful.','A'],
    ['Academic integrity rules focus on honesty about authorship.','B'],
    ['May involve copying someone else’s work.','AB'],
    ['Should be considered when reusing information found online.','AB']
  ]},
  {id:'freeware-opensource',chapterNo:7,a:'Freeware',b:'Open-source software',pages:'187–190',sectionCodes:['7.2.3'],syllabusTopicCode:'7.1',cards:[
    ['Is made available without a purchase charge to use it.','A'],
    ['Provides source code with rights to inspect, modify and redistribute it under a licence.','B'],
    ['May restrict users from studying or changing its code.','A'],
    ['May be distributed commercially while still allowing source-code access.','B'],
    ['Its defining feature is a zero price for use.','A'],
    ['Its defining feature is licence-granted source-code freedoms.','B'],
    ['May be protected by copyright.','AB'],
    ['Can be installed on a personal computer.','AB']
  ]},
  {id:'free-software-shareware',chapterNo:7,a:'Free software',b:'Shareware',pages:'187–190',sectionCodes:['7.2.3'],syllabusTopicCode:'7.1',cards:[
    ['Grants freedoms to run, study, share and modify the software.','A'],
    ['Is commonly provided as a free trial before payment is required.','B'],
    ['The word “free” refers to user freedoms, not necessarily the price.','A'],
    ['Features or use may be restricted when a trial period ends.','B'],
    ['Source-code access is necessary to exercise the freedom to modify it.','A'],
    ['May require purchase to unlock full functionality.','B'],
    ['Is distributed under a software licence.','AB'],
    ['Can be acquired without an initial payment.','AB']
  ]},
  {id:'ai-rulebased',chapterNo:7,a:'AI / machine-learning system',b:'Traditional rule-based program',pages:'189–195',sectionCodes:['7.3.1','7.3.2'],syllabusTopicCode:'7.1',cards:[
    ['May discover patterns from training examples.','A'],
    ['Follows rules explicitly written by a programmer.','B'],
    ['Its predictions can change after retraining on new data.','A'],
    ['Its decisions change mainly when the programmed rules or inputs change.','B'],
    ['A trained image classifier is an example.','A'],
    ['A program using a fixed IF–THEN tax table is an example.','B'],
    ['Uses computer processing to produce outputs from inputs.','AB'],
    ['Needs testing for correctness, reliability and potential harm.','AB']
  ]},
  {id:'ai-benefits-risks',chapterNo:7,a:'AI benefit',b:'AI risk',pages:'190–195',sectionCodes:['7.3.2','7.3.3'],syllabusTopicCode:'7.1',cards:[
    ['Can automate repetitive analysis and improve efficiency.','A'],
    ['Can reproduce unfair bias present in its training data.','B'],
    ['Can help doctors identify patterns in medical images.','A'],
    ['May displace some workers and require retraining.','B'],
    ['Can help optimise energy use and reduce waste.','A'],
    ['Large computational workloads can consume significant electricity.','B'],
    ['Can affect society, the economy and the environment.','AB'],
    ['Should be evaluated using real-world evidence and responsible oversight.','AB']
  ]},

  // Chapter 8: Databases
  {id:'filebased-relational',chapterNo:8,a:'File-based approach',b:'Relational database',pages:'197–202',sectionCodes:['8.1.1','8.1.2','8.2.1'],syllabusTopicCode:'8.1',cards:[
    ['Individual applications may maintain separate copies of the same data.','A'],
    ['Stores related data in tables connected by keys.','B'],
    ['Can make duplicate data and inconsistent updates more likely.','A'],
    ['Can reduce duplication through a normalised shared design.','B'],
    ['Changing a file structure may require changing its application code.','A'],
    ['A DBMS can provide data independence and access controls.','B'],
    ['Can store and retrieve persistent records.','AB'],
    ['Needs procedures to protect data integrity and security.','AB']
  ]},
  {id:'entity-attribute',chapterNo:8,a:'Entity',b:'Attribute',pages:'199–202',sectionCodes:['8.1.3','8.1.4'],syllabusTopicCode:'8.1',cards:[
    ['Represents a real-world object or concept about which data is stored.','A'],
    ['Represents a property or characteristic of an entity.','B'],
    ['STUDENT is a suitable example in a school database.','A'],
    ['StudentDateOfBirth is a suitable example.','B'],
    ['Usually becomes a table during relational database design.','A'],
    ['Usually becomes a column during relational database design.','B'],
    ['Is part of describing data in a database model.','AB'],
    ['Can be shown or described in an entity-relationship model.','AB']
  ]},
  {id:'one-many-many-many',chapterNo:8,a:'One-to-many relationship',b:'Many-to-many relationship',pages:'202–204',sectionCodes:['8.1.4'],syllabusTopicCode:'8.1',cards:[
    ['One record in the first entity can relate to many in the second, but not vice versa.','A'],
    ['Multiple records on both sides can be related to one another.','B'],
    ['One department employing many staff is a typical example.','A'],
    ['Students taking multiple courses is a typical example.','B'],
    ['Usually represented with a foreign key on the many side.','A'],
    ['Usually implemented using an additional junction table.','B'],
    ['Describes cardinality between entities.','AB'],
    ['Can be drawn using an entity-relationship diagram.','AB']
  ]},
  {id:'1nf-2nf',chapterNo:8,a:'First normal form (1NF)',b:'Second normal form (2NF)',pages:'203–208',sectionCodes:['8.1.5'],syllabusTopicCode:'8.1',cards:[
    ['Requires values to be atomic, without repeating groups.','A'],
    ['Requires every non-key attribute to depend on the whole candidate key.','B'],
    ['Removing a list of phone numbers from one field supports this form.','A'],
    ['Removing a dependency on only part of a composite key supports this form.','B'],
    ['Does not by itself eliminate partial dependencies.','A'],
    ['Builds on the requirements of first normal form.','B'],
    ['Is a stage in normalising a relational database.','AB'],
    ['Can reduce problems in database design.','AB']
  ]},
  {id:'2nf-3nf',chapterNo:8,a:'Second normal form (2NF)',b:'Third normal form (3NF)',pages:'203–208',sectionCodes:['8.1.5'],syllabusTopicCode:'8.1',cards:[
    ['Eliminates partial dependencies on composite candidate keys.','A'],
    ['Eliminates transitive dependencies of non-key attributes on keys.','B'],
    ['Requires the table first to satisfy first normal form.','AB'],
    ['May still contain a non-key attribute depending on another non-key attribute.','A'],
    ['A separate lookup table can remove a non-key-to-non-key dependency.','B'],
    ['Is an earlier normalisation stage than the other.','A'],
    ['A table already satisfying this form also satisfies 2NF.','B'],
    ['Helps reduce unwanted duplication and update anomalies.','AB']
  ]},
  {id:'candidate-composite-key',chapterNo:8,a:'Candidate key',b:'Composite key',pages:'199–202',sectionCodes:['8.1.3'],syllabusTopicCode:'8.1',cards:[
    ['Is a minimal set of attributes capable of uniquely identifying a row.','A'],
    ['Consists of two or more attributes used together as a key.','B'],
    ['A table may have several alternatives from which the primary key is chosen.','A'],
    ['A pair such as StudentID and CourseID can identify an enrolment.','B'],
    ['May consist of just one attribute.','A'],
    ['Always contains multiple attributes.','B'],
    ['Can be used to identify rows uniquely.','AB'],
    ['May be selected to act as the primary key of a table.','AB']
  ]},
  {id:'dbms-datadictionary',chapterNo:8,a:'DBMS',b:'Data dictionary',pages:'208–211',sectionCodes:['8.2.1','8.2.2'],syllabusTopicCode:'8.2',cards:[
    ['Provides software for defining, manipulating and controlling a database.','A'],
    ['Stores metadata describing tables, fields, types and constraints.','B'],
    ['Can process queries and manage concurrent data access.','A'],
    ['May record a field’s name, data type and permitted values.','B'],
    ['Enforces access permissions and integrity constraints.','A'],
    ['Does not normally hold the application’s main table rows itself.','B'],
    ['Supports the organisation and management of database structures.','AB'],
    ['Can contribute to consistent definitions of stored data.','AB']
  ]},
  {id:'create-alter-table',chapterNo:8,a:'CREATE TABLE',b:'ALTER TABLE',pages:'211–213',sectionCodes:['8.3.1','8.3.2'],syllabusTopicCode:'8.3',cards:[
    ['Defines a new table and its initial columns.','A'],
    ['Changes the definition of a table that already exists.','B'],
    ['May specify a new primary key when a table is first created.','A'],
    ['Can add a column to an existing table.','B'],
    ['Fails if a table of the same name already exists unless the dialect supports a guard.','A'],
    ['Can modify or remove an existing column where supported by the DBMS.','B'],
    ['Is an SQL Data Definition Language statement.','AB'],
    ['Can contain table constraints or data types.','AB']
  ]},
  {id:'sql-where-having',chapterNo:8,a:'SQL WHERE',b:'SQL HAVING',pages:'211–216',sectionCodes:['8.3.3'],syllabusTopicCode:'8.3',cards:[
    ['Filters individual rows before grouping or aggregation.','A'],
    ['Filters groups after GROUP BY and aggregation.','B'],
    ['Can test Price > 100 on each product row.','A'],
    ['Can test COUNT(*) > 5 for each department group.','B'],
    ['Can be used in SELECT queries without GROUP BY.','A'],
    ['Is commonly paired with GROUP BY for aggregate conditions.','B'],
    ['Is an SQL clause that applies a condition.','AB'],
    ['Can use comparison and logical operators.','AB']
  ]},
];
