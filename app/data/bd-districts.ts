export type Division =
  | "barishal"
  | "chattogram"
  | "dhaka"
  | "khulna"
  | "mymensingh"
  | "rajshahi"
  | "rangpur"
  | "sylhet";

export type District = {
  id: string;
  nameBn: string;
  division: Division;
  /** Matches `<path id="…">` in the district SVG (e.g. `dhaka_id`). */
  svgPathId: string;
};

export const DIVISION_LABEL_BN: Record<Division, string> = {
  barishal: "বরিশাল",
  chattogram: "চট্টগ্রাম",
  dhaka: "ঢাকা",
  khulna: "খুলনা",
  mymensingh: "ময়মনসিংহ",
  rajshahi: "রাজশাহী",
  rangpur: "রংপুর",
  sylhet: "সিলেট",
};

function spread(
  division: Division,
  names: string[],
  svgPathIds: string[],
): District[] {
  if (names.length !== svgPathIds.length) {
    throw new Error(
      `District/svg count mismatch for ${division}: ${names.length} vs ${svgPathIds.length}`,
    );
  }
  return names.map((nameBn, i) => ({
    id: `${division}-${i}`,
    nameBn,
    division,
    svgPathId: svgPathIds[i]!,
  }));
}

/** All 64 districts of Bangladesh (current administrative list). */
export const DISTRICTS: District[] = [
  ...spread("barishal", [
    "বরগুনা",
    "বরিশাল",
    "ভোলা",
    "ঝালকাঠি",
    "পটুয়াখালী",
    "পিরোজপুর",
  ], [
    "borguna_id",
    "barisal_id",
    "bhola_id",
    "jhalokathi_id",
    "patuakhali_id",
    "pirojpur_id",
  ]),
  ...spread(
    "chattogram",
    [
      "বান্দরবান",
      "ব্রাহ্মণবাড়িয়া",
      "চাঁদপুর",
      "চট্টগ্রাম",
      "কক্সবাজার",
      "কুমিল্লা",
      "ফেনী",
      "খাগড়াছড়ি",
      "লক্ষ্মীপুর",
      "নোয়াখালী",
      "রাঙ্গামাটি",
    ],
    [
      "bandorban_id",
      "brahmanbaria_id",
      "chandpur_id",
      "chottogram_id",
      "coxsbazar_id",
      "cumilla_id",
      "feni_id",
      "khagrachori_id",
      "lakshmipur_id",
      "noakhali_id",
      "rangamati_id",
    ],
  ),
  ...spread(
    "dhaka",
    [
      "ঢাকা",
      "ফরিদপুর",
      "গাজীপুর",
      "গোপালগঞ্জ",
      "কিশোরগঞ্জ",
      "মাদারীপুর",
      "মানিকগঞ্জ",
      "মুন্সীগঞ্জ",
      "নারায়ণগঞ্জ",
      "নরসিংদী",
      "রাজবাড়ী",
      "শরীয়তপুর",
      "টাঙ্গাইল",
    ],
    [
      "dhaka_id",
      "faridpur_id",
      "gazipur_id",
      "gopalgonj_id",
      "kishoreganj_id",
      "madaripur_id",
      "manikgonj_id",
      "munshiganj_id",
      "narayanganj_id",
      "narshindi_id",
      "rajbari_id",
      "shariatpur_id",
      "tangail_id",
    ],
  ),
  ...spread(
    "khulna",
    [
      "বাগেরহাট",
      "চুয়াডাঙ্গা",
      "যশোর",
      "ঝিনাইদহ",
      "খুলনা",
      "কুষ্টিয়া",
      "মাগুরা",
      "মেহেরপুর",
      "নড়াইল",
      "সাতক্ষীরা",
    ],
    [
      "bagerhat_id",
      "chuadanga_id",
      "jessore_id",
      "jhinaidaha_id",
      "khulna_id",
      "kushtia_id",
      "magura_id",
      "meherpur_id",
      "narail_id",
      "shatkhira_id",
    ],
  ),
  ...spread(
    "mymensingh",
    ["জামালপুর", "ময়মনসিংহ", "নেত্রকোণা", "শেরপুর"],
    ["jamalpur_id", "mymensingh_id", "netrokona_id", "sherpur_id"],
  ),
  ...spread(
    "rajshahi",
    [
      "বগুড়া",
      "চাঁপাইনবাবগঞ্জ",
      "জয়পুরহাট",
      "নওগাঁ",
      "নাটোর",
      "পাবনা",
      "রাজশাহী",
      "সিরাজগঞ্জ",
    ],
    [
      "bogra_id",
      "nawabganj_id",
      "jaipurhat_id",
      "naogaon_id",
      "nator_id",
      "pabna_id",
      "rajshahi_id",
      "sirajgonj_id",
    ],
  ),
  ...spread(
    "rangpur",
    [
      "দিনাজপুর",
      "গাইবান্ধা",
      "কুড়িগ্রাম",
      "লালমনিরহাট",
      "নীলফামারী",
      "পঞ্চগড়",
      "রংপুর",
      "ঠাকুরগাঁও",
    ],
    [
      "dinajpur_id",
      "gaibandha_id",
      "kurigram_id",
      "lalmonirhat_id",
      "nilfamari_id",
      "panchagarh_id",
      "rangpur_id",
      "thakurgaon_id",
    ],
  ),
  ...spread(
    "sylhet",
    ["হবিগঞ্জ", "মৌলভীবাজার", "সুনামগঞ্জ", "সিলেট"],
    ["habiganj_id", "maulvibajar_id", "sunamganj_id", "sylhet_id"],
  ),
];
