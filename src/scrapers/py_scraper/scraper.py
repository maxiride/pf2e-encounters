"""
Monsters JSON Scraper
"""
import os
import json
import dataclasses
from dataclasses import dataclass, field
from typing import List, Set

import requests

#** Variables **#

#: user-agent to use when making requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.81 Safari/537.36'

#: cache for raw-npcs results
NPCS_CACHE = 'npcs-raw.json'

#: cache for raw-monsters results
MONSTERS_CACHE = 'monsters-raw.json'

#: aeonprd hostname
AEONPRD = '2e.aonprd.com'

#: aeonprd elatasearch hostname
AEONPRD_ELASTIC = 'https://elasticsearch.aonprd.com/aon/_search'

#: pre-calculated aonprd elastic lookup query-params
ELASTIC_PARAM = {'track_total_hits': 'true'}

#: pre-calculated headers to include during elasticsearch lookup
ELASTIC_HEADERS = {
    'user-agent':     USER_AGENT,
    'accept':         '*/*',
    'origin':         f'https://{AEONPRD}',
    'referer':        f'https://{AEONPRD}',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-gpc':        1,
}

#** Functions **#

def creature_data(npcs: bool = False) -> dict:
    """retrieve raw monster-data from aonprd elasticsearch"""
    # retrieve from file-cache
    cache = NPCS_CACHE if npcs else MONSTERS_CACHE
    if os.path.exists(cache):
        with open(cache, 'r') as f:
            return json.load(f)
    # construct query json 
    json_post = {
        "query":{
            "function_score":{
                "query":{
                    "bool":{
                        "filter":[
                            {"query_string":{
                                "query":f"category:creature npc:{str(npcs).lower()} ",
                                "default_operator":"AND",
                                "fields":["name","text^0.1","trait_raw","type"]
                            }}
                        ],
                        "must_not":[{"term":{"exclude_from_search":True}}]
                    }
                },
                "boost_mode":"multiply",
                "functions":[
                    {"filter":{"terms":{"type":["Ancestry","Class"]}},"weight":1.1},
                    {"filter":{"terms":{"type":["Trait"]}},"weight":1.05}
                ]
            }
        },
        "size":    10000,
        "sort":    ["_score","_doc"],
        "_source": {"excludes":["text"]},
        "aggs":    {
            "group1":{
                "composite":{
                    "sources":[{"field1":{"terms":{"field":"type","missing_bucket":True}}}],
                    "size":10000
                }
            }
        }
    }
    # make request and write to cache
    res = requests.post(AEONPRD_ELASTIC, params=ELASTIC_PARAM, json=json_post)
    with open(cache, 'wb') as f:
        f.write(res.content)
    return res.json()

def parse_creatures(data: dict) -> List['Creature']:
    """parse through raw monster data to retrieve imporant details"""
    # parse creatures from raw data
    creatures = []
    for hit in data['hits']['hits']:
        attrs   = hit['_source']

        name    = attrs['name']
        id      = attrs['url'].rsplit('=', 1)[1]
        if not id.isdigit():
            raise RuntimeError(f'failed to parse {name!r}')
        npc      = attrs.get('npc', False)

        # Some creaturea trow an error because aignment is missing
        try:
            align    = attrs['alignment']
        except KeyError:
            align    = "NA"

        traits   = set(attrs['trait']) 
        images   = attrs.get('image', [])
        creature = 'NPC' if npc else attrs['type'] 

        if align in traits:
            traits.remove(align)
        
        creatures.append(Creature(
            id=id,
            name=name,
            level=attrs['level'],
            alignment=align,
            creature_type=creature,
            size=attrs['size'][0],
            rarity=attrs['rarity'],
            lore=attrs.get('summary', ''),
            family=attrs.get('creature_family', ''),
            image_url=images[0] if images else '',
            npc=npc,
            traits=traits,
        ))
    return creatures

def generate_data(creatures: List['Creature']) -> 'Data':
    """generate metadata and pass into data object"""
    # generate meta-data from collected monsters
    meta = Metadata(total=len(creatures))
    for creature in creatures:
        meta.min_level = min(meta.min_level, creature.level)
        meta.max_level = max(meta.max_level, creature.level)
        meta.alignments.add(creature.alignment)
        meta.creature_types.add(creature.creature_type)
        meta.rarities.add(creature.rarity)
        meta.sizes.add(creature.size)
        meta.traits |= creature.traits
        if creature.family:
            meta.families.add(creature.family)
    return Data(creatures, meta)

#** Classes **#

@dataclass
class Metadata:
    min_level:      int       = 0
    max_level:      int       = 0 
    total:          int       = 0
    families:       Set[str] = field(default_factory=set)
    alignments:     Set[str] = field(default_factory=set)
    creature_types: Set[str] = field(default_factory=set)
    traits:         Set[str] = field(default_factory=set)
    rarities:       Set[str] = field(default_factory=set)
    sizes:          Set[str] = field(default_factory=set)

@dataclass
class Creature:
    id:            str
    name:          str
    creature_type: str
    level:         int
    alignment:     str
    size:          str
    rarity:        str
    lore:          str
    family:        str
    image_url:     str
    npc:           bool     = False
    traits:        Set[str] = field(default_factory=set)

@dataclass(repr=False)
class Data:
    creatures: List[Creature] = field(default_factory=list)
    metadata:  Metadata       = field(default_factory=Metadata)

    def __repr__(self) -> str:
        return f'Creatures(found={len(self.creatures)}, meta={self.metadata!r})'

class JsonEncoder(json.JSONEncoder):
    """custom json encoder to convert sets to supported list-type"""
    def default(self, obj):
        if isinstance(obj, set):
            return sorted(list(obj))
        if dataclasses.is_dataclass(obj):
            return dataclasses.asdict(obj)
        return super().default(obj)


#** Init **#

if(__name__ == '__main__'):
    data     = creature_data(npcs=False)
    monsters = parse_creatures(data)

    data = creature_data(npcs=True)
    npcs = parse_creatures(data)

    collected = generate_data(monsters + npcs)
    with open('creatures.json', 'w') as f:
        json.dump(collected, f, cls=JsonEncoder)