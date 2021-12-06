package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"sync"

	"github.com/davecgh/go-spew/spew"
	"github.com/helloeave/json"
)

// baseURL for creatures pages
const baseURL = "https://2e.aonprd.com/"

type Data struct {
	Creatures []Creature `json:"creatures"`
	Metadata  metadata   `json:"metadata"`
}

type Creature struct {
	Name         string   `json:"name"`
	Family       string   `json:"family"`
	Level        int      `json:"level"`
	Alignment    string   `json:"alignment"`
	CreatureType string   `json:"creature_type"`
	Size         string   `json:"size"`
	Traits       []string `json:"traits"`
	Rarity       string   `json:"rarity"`
	Id           string   `json:"id"`
	Lore         string   `json:"lore"`
	ImgURL       string   `json:"image_url"`
}

type metadata struct {
	MinLevel      int      `json:"min_level"`
	MaxLevel      int      `json:"max_level"`
	Total         int      `json:"total"`
	Families      []string `json:"families"`
	Alignments    []string `json:"alignments"`
	CreatureTypes []string `json:"creature_types"`
	Traits        []string `json:"traits"`
	Rarities      []string `json:"rarities"`
	Sizes         []string `json:"sizes"`
}

func main() {
	// FIXME hardcoded id, should be .env for good practices
	url := "https://2e.aonprd.com/Monsters.aspx?Letter=All"
	npcurl := "https://2e.aonprd.com/NPCs.aspx?Letter=All"

	var d Data
	if file, ok := ioutil.ReadFile("output/creatures.json"); ok == nil {
		log.Print("creatures.json already present, will skip fetching and just compile the metadata")
		_ = json.Unmarshal(file, &d)
		d.FillMetadata()
		jsonC, _ := json.MarshalSafeCollections(d)
		_ = os.Mkdir("output", os.ModePerm)
		_ = ioutil.WriteFile("output/creatures.json", jsonC, os.ModePerm)
		return
	}

	creatureCh := make(chan string)
	npcCh := make(chan string)

	go func(url string) {
		creatureCh <- getAONCreatures(url)
	}(url)

	go func(npcurl string) {
		npcCh <- getAONCreatures(npcurl)
	}(npcurl)

	/* creaturesMainTable := getAONCreatures(url)
	npcMainTable := getAONCreatures(npcurl) */

	creaturesMainTable := <- creatureCh
	npcMainTable := <- npcCh

	d.parseAONTable(creaturesMainTable)
	d.parseAONTable(npcMainTable)

	var wg sync.WaitGroup

	for i, c := range d.Creatures {
		wg.Add(1)

		go func ()  {
			defer wg.Done()
			d.getCreatureDetails(i, c.Id)
		} ()
		//TODO reformat to only call one or the other based on creature. Need a discriminant between the two.

		// If in debug, fetch detailed infos of only three creatures
		if os.Getenv("DEBUG") == "1" && i == 3 {
			break
		}

		str := fmt.Sprintf("Fetching creature %d of %d \r", i, len(d.Creatures))
		_, _ = io.WriteString(io.Writer(os.Stdout), str)
		
		// Slow down execution to avoid too many request to website.
		// Number can be tweeked for better performance: 500 give total time around 35s for me
		if i % 500 == 0 {
			wg.Wait()
		}

	}
	wg.Wait()

	// Pretty print the result, DEBUG only
	if os.Getenv("DEBUG") == "1" {
		fmt.Printf("Found %d creatures\n", len(d.Creatures))
		// Just spew a bunch of them, we don't need to check them all!
		spew.Dump(d.Creatures[:2])
	}

	// Save creatures
	jsonC, _ := json.MarshalSafeCollections(d)
	_ = os.Mkdir("output", os.ModePerm)
	_ = ioutil.WriteFile("output/creatures.json", jsonC, os.ModePerm)

	// Add additional metadata and save
	d.FillMetadata()
	jsonC, _ = json.MarshalSafeCollections(d)
	_ = os.Mkdir("output", os.ModePerm)
	_ = ioutil.WriteFile("output/creatures.json", jsonC, os.ModePerm)

}
