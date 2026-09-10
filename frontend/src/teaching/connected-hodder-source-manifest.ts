export type ConnectedHodderPageFingerprint = {
  printedPage: number;
  sha256: string;
};

export type ConnectedHodderSourceManifest = {
  syllabus: '9618' | '0478';
  chapter: number;
  sourceFile: string;
  sourceFileSha256: string;
  sourceFilePageCount: number;
  physicalPageRange: readonly [number, number];
  printedPageRange: readonly [number, number];
  pages: readonly ConnectedHodderPageFingerprint[];
};

export type RejectedConnectedHodderSourceEvidence = {
  syllabus: '9618' | '0478';
  requestedChapter: number;
  sourceFile: string;
  exportedSourceSha256: string;
  exportedPageCount: number;
  terminalPrintedPage: number;
  reason: string;
};

/**
 * Exact connected-source locks. Fingerprints are SHA-256 hashes of each
 * chapter page's whitespace-normalized PDF text layer. Physical page 84 maps
 * to printed p.68 in this exact 576-page Hodder export.
 */
export const CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST: ConnectedHodderSourceManifest = {
  syllabus: '9618',
  chapter: 3,
  sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
  sourceFileSha256: '760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95',
  sourceFilePageCount: 576,
  physicalPageRange: [84, 122],
  printedPageRange: [68, 106],
  pages: [
    [68,'e885f61d693fa6162dcedf9ecbda8b49020ae231951d5e087a28b8539b12e1cd'],
    [69,'28b48eabff65310564d7d7ef3bd3150a415ec7a662efa91314dd2e0baffd5cdf'],
    [70,'0131d91999b471201d6e6940cd2044835fd2a9695c8305e43f59f32658781a9f'],
    [71,'51590ace6a567807c871692ae7affe9168c7874eb837edb9762a08e295b9c3dc'],
    [72,'ae0aabf31cdb94a808e670387ef900d83cba9917e01227cd7e6c5867dfaf4694'],
    [73,'964c78bd54868cd96ad77a34315472358aa9bf59fbfb0fc039cee24b91c71a59'],
    [74,'b07d168b8779578d57ff3f8fbcc9f98fcaffaf94444d26b09c3d031b63fd140a'],
    [75,'b6a855c4a4ca81ed9b3c5cbeaaf42dbd217d3ef781265c8825b63db9a1872cf8'],
    [76,'2aa85802f67db045940ebea3a67067937063729753ac667f2b3bb3decbcf4aaf'],
    [77,'d45a10f1661faf84034c06ad709ad5b9156cf9a3aa7bfdd700924d4cea9563ae'],
    [78,'076dcec369fd2f9a3bc743fb1aeaaac565e57ef51cdc36750fa56a89e3f558e6'],
    [79,'e1e8bc944eb99702397bfb0bbc62b7770f1c1be29c272008080a3b2e4d59cbca'],
    [80,'88b3648484328328389b08d600d1ef18ff3fdbf858e6b302e8e6833ecc8e8c2a'],
    [81,'cc33e399f4befbe62d555f59805c8db45e050cdf38c04e19ae76d926d2734a7f'],
    [82,'1a1767980204573cfd727b0ce61a945810111f50fe2324d03fbb51c68f9fce8f'],
    [83,'a458dde3ba8ffc4dfdacf49cd2ecc65ad93c74aff18ccfa67fea0c12845ac011'],
    [84,'8bc0ad80c2ed08e28668068fda220c81a509342121348e2931ead50f6e7ac002'],
    [85,'be4860394b3844ac54fc3377a27b83a489fe6efc75132774e6a1f6497502902c'],
    [86,'5b104b92d0ac62fda334483b8f8ce911bcb7afebe8e9c343214dcfbb08f43a13'],
    [87,'b200b34502f7bf2eb05cfff915024472924a750ec15a01570572dd84914f9274'],
    [88,'f0f71e4470d839f624bb13e8a6a67c772a125903bfaa780a6e953a92892b4638'],
    [89,'852b18f8986340a345ec5d168605f1a83d7d8f131f663ff7dec66df40e5c1a1a'],
    [90,'d26c34a8710196b6a54c027ede5252887c756a0ff0f78bf1570f3048664fc1ea'],
    [91,'ed8794ac478ab9f46954100bcfa90fb2fc671ba2d57f1fa3db4b2ccb3bcfaf26'],
    [92,'2c2560465db8c4926628bf8d64519445b761e8582cb12d8767b0399819234bb8'],
    [93,'1fca2afe7b5326b497aeb29202cc976d1f005584cbadc87b36a9ece917aa9c42'],
    [94,'6de44dbc559cf8f4f48ba82bda04b6a00bd5258589c70f0197ed8b8b88e8313d'],
    [95,'4c8175118b8321657c535f1e7bc11a85457ad15185da1df521b03496626a1124'],
    [96,'9b2c80f989018948851fc9c707873626427b33267cb0d0efc3eb6a56054a72b9'],
    [97,'1a0c9301cc9a98469412649d11d27d2f3349bc03bd963f91165b1e8c557ae3ed'],
    [98,'a7b3838a35e59ced6455f534d080ef9cb63d862ae4f1edeb54691181c8de884d'],
    [99,'a167dc1a2a78e3bf89b7553b6cde78cd34da515a0d830e7b85aaff9dc641a315'],
    [100,'0606b64106f5f573bc118d20d6e8b5aec2ca95e17d52f32393f07bea1882faa2'],
    [101,'a3f24963b6f29c1bbafd900167b3cd580e2440d28b91aeb52e04d2ae925ab80b'],
    [102,'35c12d819c51a9d1ef4d5ea7ff10adbd478320a1560a564d0553e116110bac55'],
    [103,'e1031ad62e73021fd1de734d57d0b547aa7c9bacc5d30832e28b3eb7e8e5a073'],
    [104,'82cd938f46c1841e375cac436548f77e553ac540eb9b04445b9b3d85099a0f6c'],
    [105,'37e2b1205878d16811719e68829d6c6fd26407034a019334e275b25a4c836939'],
    [106,'99f47093cd4550c3a642c089b3037cbd27824fd39c2005c1fd571281face1341'],
  ].map(([printedPage, sha256]) => ({ printedPage: printedPage as number, sha256: sha256 as string })),
};

export const CONNECTED_HODDER_SOURCE_MANIFESTS: readonly ConnectedHodderSourceManifest[] = [
  CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST,
];

/** Historical rejected export retained as regression evidence. It is not the
 * same bytes as the now-verified 576-page connected source above. */
export const CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION: RejectedConnectedHodderSourceEvidence = {
  syllabus: '9618',
  requestedChapter: 3,
  sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
  exportedSourceSha256: '3994b727128cea398b0622ff1ae83a643edf9a3a654cbd3d548b1c5f65c06126',
  exportedPageCount: 97,
  terminalPrintedPage: 64,
  reason: 'Historical connected export ended in Chapter 2 and did not contain Chapter 3; never treat that byte identity as a valid Chapter 3 source.',
};
