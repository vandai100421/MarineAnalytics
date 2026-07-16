SHIP_TYPE_NAMES: dict[int, str] = {
    0: "Not available",
    20: "Wing in ground",
    30: "Fishing",
    31: "Towing",
    32: "Towing (large)",
    33: "Dredging",
    34: "Diving",
    35: "Military",
    36: "Sailing",
    37: "Pleasure craft",
    40: "High-speed craft",
    50: "Pilot vessel",
    51: "Search and rescue",
    52: "Tug",
    53: "Port tender",
    54: "Anti-pollution",
    55: "Law enforcement",
    58: "Medical transport",
    59: "Noncombatant",
    60: "Passenger",
    70: "Cargo",
    80: "Tanker",
    90: "Other",
}


def get_ship_type_name(code: int | None) -> str | None:
    if code is None:
        return None
    if code in SHIP_TYPE_NAMES:
        return SHIP_TYPE_NAMES[code]
    if 20 <= code <= 29:
        return "Wing in ground"
    if 40 <= code <= 49:
        return "High-speed craft"
    if 60 <= code <= 69:
        return "Passenger"
    if 70 <= code <= 79:
        return "Cargo"
    if 80 <= code <= 89:
        return "Tanker"
    return "Other"
