"""seed major world ports

Revision ID: b1002_seed
Revises: b1001_ports
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op

revision: str = "b1002_seed"
down_revision: Union[str, None] = "b1001_ports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


MAJOR_PORTS: list[tuple[str, str, str, float, float, int, str]] = [
    ("Singapore", "SG", "SGSIN", 1.2640, 103.8400, 5000, "sea_port"),
    ("Shanghai", "CN", "CNSHA", 31.2300, 121.4700, 5000, "sea_port"),
    ("Shenzhen", "CN", "CNSZX", 22.5000, 113.9300, 5000, "sea_port"),
    ("Ningbo-Zhoushan", "CN", "CNNGB", 29.8700, 121.5500, 5000, "sea_port"),
    ("Guangzhou", "CN", "CNCAN", 23.1000, 113.2600, 5000, "sea_port"),
    ("Qingdao", "CN", "CNTAO", 36.0700, 120.3200, 5000, "sea_port"),
    ("Tianjin", "CN", "CNTSN", 38.9700, 117.7800, 5000, "sea_port"),
    ("Xiamen", "CN", "CNXMN", 24.4800, 118.0800, 5000, "sea_port"),
    ("Dalian", "CN", "CNDLC", 38.9300, 121.6200, 5000, "sea_port"),
    ("Yingkou", "CN", "CNYIK", 40.2700, 122.0800, 5000, "sea_port"),
    ("Busan", "KR", "KRPUS", 35.0800, 129.0400, 5000, "sea_port"),
    ("Hong Kong", "HK", "HKHKG", 22.3000, 114.1700, 5000, "sea_port"),
    ("Kaohsiung", "TW", "TWKHH", 22.6200, 120.2900, 5000, "sea_port"),
    ("Port Klang", "MY", "MYPKG", 3.0000, 101.3900, 5000, "sea_port"),
    ("Tanjung Pelepas", "MY", "MYTPP", 1.3600, 103.5500, 5000, "sea_port"),
    ("Manila", "PH", "PHMNL", 14.5800, 120.9700, 5000, "sea_port"),
    ("Tokyo", "JP", "JPTYO", 35.6500, 139.7700, 5000, "sea_port"),
    ("Yokohama", "JP", "JPYOK", 35.4500, 139.6500, 5000, "sea_port"),
    ("Kobe", "JP", "JPUKB", 34.6900, 135.2000, 5000, "sea_port"),
    ("Nagoya", "JP", "JPNGO", 35.0500, 136.8800, 5000, "sea_port"),
    ("Laem Chabang", "TH", "THLCH", 13.1000, 100.8800, 5000, "sea_port"),
    ("Bangkok", "TH", "THBKK", 13.7500, 100.5000, 5000, "river_port"),
    ("Ho Chi Minh (Cat Lai)", "VN", "VNSGN", 10.7800, 106.7700, 5000, "sea_port"),
    ("Hai Phong", "VN", "VNHPH", 20.8600, 106.6800, 5000, "sea_port"),
    ("Vung Ang", "VN", "VNVUT", 18.6900, 106.3800, 5000, "sea_port"),
    ("Da Nang", "VN", "VNDAD", 16.1000, 108.2200, 5000, "sea_port"),
    ("Cai Lan", "VN", "VNCLH", 20.9500, 107.0800, 5000, "sea_port"),
    ("Quy Nhon", "VN", "VNUIH", 13.7800, 109.2200, 5000, "sea_port"),
    ("Rotterdam", "NL", "NLRTM", 51.9500, 4.1400, 6000, "sea_port"),
    ("Antwerp", "BE", "BEANR", 51.3000, 4.3200, 5000, "sea_port"),
    ("Hamburg", "DE", "DEHAM", 53.5400, 9.9700, 5000, "sea_port"),
    ("Amsterdam", "NL", "NLAMS", 52.4000, 4.9000, 5000, "sea_port"),
    ("Felixstowe", "GB", "GBFXT", 51.9500, 1.3200, 5000, "sea_port"),
    ("Southampton", "GB", "GBSOU", 50.8900, -1.3900, 5000, "sea_port"),
    ("Liverpool", "GB", "GBLIV", 53.4500, -3.0000, 5000, "sea_port"),
    ("Algeciras", "ES", "ESALG", 36.1300, -5.4400, 5000, "sea_port"),
    ("Valencia", "ES", "ESVLC", 39.4400, -0.3200, 5000, "sea_port"),
    ("Barcelona", "ES", "ESBCN", 41.3500, 2.1700, 5000, "sea_port"),
    ("Piraeus", "GR", "GRPIR", 37.9400, 23.6500, 5000, "sea_port"),
    ("Genoa", "IT", "ITGOA", 44.4000, 8.9000, 5000, "sea_port"),
    ("Marseille", "FR", "FRMRS", 43.3000, 5.3700, 5000, "sea_port"),
    ("Le Havre", "FR", "FRLEH", 49.4900, 0.1100, 5000, "sea_port"),
    ("Bremerhaven", "DE", "DEBRV", 53.5500, 8.5800, 5000, "sea_port"),
    ("Gdansk", "PL", "PLGDN", 54.4000, 18.6600, 5000, "sea_port"),
    ("Constanza", "RO", "ROCND", 44.1700, 28.6600, 5000, "sea_port"),
    ("Istanbul", "TR", "TRIST", 41.0100, 28.9700, 5000, "sea_port"),
    ("Jebel Ali", "AE", "AEJEA", 25.0100, 55.0600, 5000, "sea_port"),
    ("Jeddah", "SA", "SAJED", 21.4800, 39.1900, 5000, "sea_port"),
    ("Salalah", "OM", "OMSLL", 16.9500, 54.0000, 5000, "sea_port"),
    ("Abu Dhabi", "AE", "AEAUH", 24.4400, 54.4000, 5000, "sea_port"),
    ("Doha", "QA", "QADOH", 25.2800, 51.5200, 5000, "sea_port"),
    ("Dammam", "SA", "SADMM", 26.5000, 50.1800, 5000, "sea_port"),
    ("Bandar Abbas", "IR", "IRBND", 27.1800, 56.0800, 5000, "sea_port"),
    ("Colombo", "LK", "LKCMB", 6.9300, 79.8400, 5000, "sea_port"),
    ("Chittagong", "BD", "BDCTG", 22.3300, 91.8300, 5000, "sea_port"),
    ("Mumbai", "IN", "INBOM", 18.9300, 72.8300, 5000, "sea_port"),
    ("Mundra", "IN", "INMUN", 22.8400, 69.7000, 5000, "sea_port"),
    ("Chennai", "IN", "INMAA", 13.0800, 80.2900, 5000, "sea_port"),
    ("Karachi", "PK", "PKKHI", 24.8100, 66.9800, 5000, "sea_port"),
    ("Sydney", "AU", "AUSYD", -33.8500, 151.2300, 5000, "sea_port"),
    ("Melbourne", "AU", "AUMEL", -37.8300, 144.9300, 5000, "sea_port"),
    ("Auckland", "NZ", "NZAKL", -36.8400, 174.7700, 5000, "sea_port"),
    ("Los Angeles", "US", "USLAX", 33.7300, -118.2700, 5000, "sea_port"),
    ("Long Beach", "US", "USLGB", 33.7700, -118.2200, 5000, "sea_port"),
    ("New York", "US", "USNYC", 40.7000, -74.0000, 5000, "sea_port"),
    ("Savannah", "US", "USSAV", 32.0800, -81.0900, 5000, "sea_port"),
    ("Houston", "US", "USHOU", 29.7200, -95.0200, 5000, "sea_port"),
    ("Oakland", "US", "USOAK", 37.8000, -122.3000, 5000, "sea_port"),
    ("Seattle", "US", "USSEA", 47.5700, -122.3400, 5000, "sea_port"),
    ("Charleston", "US", "USCHS", 32.7800, -79.9300, 5000, "sea_port"),
    ("Miami", "US", "USMIA", 25.7700, -80.1700, 5000, "sea_port"),
    ("Vancouver", "CA", "CAVAN", 49.2900, -123.1100, 5000, "sea_port"),
    ("Prince Rupert", "CA", "CAPRR", 54.3200, -130.3300, 5000, "sea_port"),
    ("Santos", "BR", "BRSSZ", -23.9900, -46.3000, 5000, "sea_port"),
    ("Itajai", "BR", "BRITJ", -26.9100, -48.6600, 5000, "sea_port"),
    ("Manaus", "BR", "BRMAO", -3.1500, -60.0400, 5000, "river_port"),
    ("Buenos Aires", "AR", "ARBUE", -34.6000, -58.3600, 5000, "sea_port"),
    ("Callao", "PE", "PECLL", -12.0500, -77.1500, 5000, "sea_port"),
    ("Balboa", "PA", "PABLB", 8.7800, -79.4500, 5000, "sea_port"),
    ("Colon", "PA", "PACOL", 9.3600, -79.9000, 5000, "sea_port"),
    ("Kingston", "JM", "JMKIN", 17.9700, -76.8000, 5000, "sea_port"),
    ("Freeport", "BS", "BSFPO", 26.5300, -78.7000, 5000, "sea_port"),
    ("Durban", "ZA", "ZADUR", -29.8700, 31.0400, 5000, "sea_port"),
    ("Cape Town", "ZA", "ZACPT", -33.9000, 18.4400, 5000, "sea_port"),
    ("Suez", "EG", "EGSUZ", 29.9700, 32.5500, 5000, "sea_port"),
    ("Tanger Med", "MA", "MATNG", 35.9000, -5.5000, 5000, "sea_port"),
    ("Casablanca", "MA", "MACAS", 33.5900, -7.6200, 5000, "sea_port"),
    ("Lagos", "NG", "NGLOS", 6.4500, 3.3700, 5000, "sea_port"),
    ("Tema", "GH", "GHTEM", 5.6400, 0.0100, 5000, "sea_port"),
    ("Abidjan", "CI", "CIABJ", 5.2800, -4.0200, 5000, "sea_port"),
    ("Dakar", "SN", "SNDKR", 14.6800, -17.4200, 5000, "sea_port"),
    ("Mombasa", "KE", "KEMBA", -4.0400, 39.6600, 5000, "sea_port"),
    ("Dar es Salaam", "TZ", "TZDAR", -6.8200, 39.2900, 5000, "sea_port"),
    ("Maputo", "MZ", "MZMPM", -25.9700, 32.5700, 5000, "sea_port"),
    ("Vladivostok", "RU", "RUVVO", 43.1100, 131.8700, 5000, "sea_port"),
    ("St Petersburg", "RU", "RULED", 59.9000, 30.2500, 5000, "sea_port"),
    ("Muransk", "RU", "RUMMK", 68.9700, 33.0800, 5000, "sea_port"),
    ("Helsinki", "FI", "FIHEL", 60.1500, 25.0000, 5000, "sea_port"),
    ("Stockholm", "SE", "SESTO", 59.3300, 18.0700, 5000, "sea_port"),
    ("Copenhagen", "DK", "DKCPH", 55.6700, 12.6200, 5000, "sea_port"),
    ("Oslo", "NO", "NOOSL", 59.9000, 10.7300, 5000, "sea_port"),
    ("Gothenburg", "SE", "SEGOT", 57.7000, 11.9700, 5000, "sea_port"),
    ("Riga", "LV", "LVRIX", 56.9500, 24.0900, 5000, "sea_port"),
    ("Tallinn", "EE", "EETLL", 59.4400, 24.7500, 5000, "sea_port"),
    ("Klaipeda", "LT", "LTKLJ", 55.7200, 21.1300, 5000, "sea_port"),
    ("Marseille-Fos", "FR", "FRFOS", 43.4400, 4.8500, 5000, "sea_port"),
    ("Trieste", "IT", "ITTRS", 45.6500, 13.7600, 5000, "sea_port"),
    ("Venice", "IT", "ITVCE", 45.4400, 12.3300, 5000, "river_port"),
    ("Koper", "SI", "SIKOP", 45.5700, 13.7600, 5000, "sea_port"),
    ("Rijeka", "HR", "HRRJK", 45.3300, 14.4500, 5000, "sea_port"),
    ("Dubrovnik", "HR", "HRDBV", 42.6500, 18.0900, 5000, "sea_port"),
    ("Mumbai JNPT", "IN", "INJNP", 18.9500, 72.9500, 5000, "sea_port"),
    ("Colombo", "LK", "LKCMB", 6.9300, 79.8400, 5000, "sea_port"),
    ("Yangon", "MM", "MMRGN", 16.7700, 96.1700, 5000, "river_port"),
    ("Penang", "MY", "MYPEN", 5.4200, 100.2300, 5000, "sea_port"),
    ("Brisbane", "AU", "AUBNE", -27.3800, 153.0900, 5000, "sea_port"),
    ("Fremantle", "AU", "AUFRE", -32.0500, 115.7400, 5000, "sea_port"),
    ("Tanjung Priok", "ID", "IDJKT", -6.1000, 106.8800, 5000, "sea_port"),
    ("Surabaya", "ID", "IDSUB", -7.2000, 112.7400, 5000, "sea_port"),
    ("Belawan", "ID", "IDBLW", 3.7800, 98.6900, 5000, "sea_port"),
    ("Makassar", "ID", "IDUPG", -5.1300, 119.4100, 5000, "sea_port"),
    ("Davao", "PH", "PHDVO", 7.0700, 125.6200, 5000, "sea_port"),
    ("Cebu", "PH", "PHCEB", 10.3000, 123.9000, 5000, "sea_port"),
    ("Wellington", "NZ", "NZWLG", -41.2900, 174.7800, 5000, "sea_port"),
    ("Suva", "FJ", "FJSUV", -18.1400, 178.4400, 5000, "sea_port"),
    ("Noumea", "NC", "NCNOU", -22.2700, 166.4400, 5000, "sea_port"),
    ("Port Vila", "VU", "VUVLI", -17.7400, 168.2900, 5000, "sea_port"),
    ("Apia", "WS", "WSAPW", -13.8300, -171.7700, 5000, "sea_port"),
    ("Honolulu", "US", "USHNL", 21.3100, -157.8600, 5000, "sea_port"),
    ("Guam", "GU", "GUGUM", 13.4500, 144.7400, 5000, "sea_port"),
    ("Saipan", "MP", "MPSPN", 15.1800, 145.7400, 5000, "sea_port"),
    ("Papeete", "PF", "PFPPT", -17.5300, -149.5700, 5000, "sea_port"),
    ("Valparaiso", "CL", "CLVAP", -33.0500, -71.6300, 5000, "sea_port"),
    ("San Antonio", "CL", "CLSAI", -33.5900, -71.6800, 5000, "sea_port"),
    ("Guayaquil", "EC", "ECGYE", -2.6400, -80.3700, 5000, "sea_port"),
    ("Buenaventura", "CO", "COBUN", 3.8900, -77.0800, 5000, "sea_port"),
    ("Cartagena", "CO", "COCTG", 10.4000, -75.5300, 5000, "sea_port"),
    ("Puerto Cabello", "VE", "VEPCZ", 10.4700, -68.0000, 5000, "sea_port"),
    ("Havana", "CU", "CUHAV", 23.1500, -82.3500, 5000, "sea_port"),
    ("Veracruz", "MX", "MXVER", 19.2000, -96.1300, 5000, "sea_port"),
    ("Manzanillo", "MX", "MXZLO", 19.0500, -104.3400, 5000, "sea_port"),
    ("Lazaro Cardenas", "MX", "MXLZC", 17.9500, -102.1900, 5000, "sea_port"),
    ("Halifax", "CA", "CAHAL", 44.6500, -63.5700, 5000, "sea_port"),
    ("Montreal", "CA", "CAMTR", 45.5000, -73.5500, 5000, "river_port"),
    ("Toronto", "CA", "CATOR", 43.6500, -79.3700, 5000, "river_port"),
    ("Kuwait", "KW", "KWKWI", 29.3400, 47.9400, 5000, "sea_port"),
    ("Bahrain", "BH", "BHBAH", 26.2300, 50.6200, 5000, "sea_port"),
    ("Yokohama", "JP", "JPYOK", 35.4500, 139.6500, 5000, "sea_port"),
    ("Sasebo", "JP", "JPSSB", 33.1600, 129.7200, 5000, "sea_port"),
    ("Fremantle", "AU", "AUFRE", -32.0500, 115.7400, 5000, "sea_port"),
]


def upgrade() -> None:
    values = []
    for name, cc, unlocode, lat, lon, radius, ptype in MAJOR_PORTS:
        escaped_name = name.replace("'", "''")
        escaped_unlocode = unlocode.replace("'", "''") if unlocode else ""
        values.append(
            f"('{escaped_name}', '{cc}', '{escaped_unlocode}', {lat}, {lon}, {radius}, '{ptype}', "
            f"ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)::geography)"
        )

    op.execute(
        "INSERT INTO ports (name, country_code, unlocode, lat, lon, radius_m, type, geom) VALUES "
        + ", ".join(values)
    )


def downgrade() -> None:
    op.execute("DELETE FROM ports")
