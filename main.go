package main

import (
	"fmt"
	"github.com/davecgh/go-spew/spew"
	"github.com/helloeave/json"
	"io"
	"io/ioutil"
	"os"
)

// baseURL for creatures pages
const baseURL = "https://2e.aonprd.com/Monsters.aspx?ID="

var creatures []Creature

type Creature struct {
	Name         string   `json:"name"`
	Family       string   `json:"family"`
	Level        string   `json:"level"`
	Alignment    string   `json:"alignment"`
	CreatureType string   `json:"creature_type"`
	Size         string   `json:"size"`
	Traits       []string `json:"traits"`
	Rarity       string   `json:"rarity"`
	Id           string   `json:"id"`
	Lore         string   `json:"lore"`
}

func main() {
	// FIXME hardcoded id, should be .env for good practices
	url := "https://2e.aonprd.com/Monsters.aspx?Letter=All"

	creaturesMainTable := getAONCreatures(url)
	parseAONTable(creaturesMainTable)

	for i, c := range creatures {
		getCreatureDetails(i, c.Id)
		if os.Getenv("DEBUG") == "1" && i == 3 {
			break
		}

		str := fmt.Sprintf("Fetching creature %d of %d \r", i, len(creatures))
		_, _ = io.WriteString(io.Writer(os.Stdout), str)
	}

	// Pretty print the result, DEBUG only
	if os.Getenv("DEBUG") == "1" {
		fmt.Printf("Found %i creatures\n", len(creatures))
		// Just spew a bunch of them, we don't need to check them all!
		spew.Dump(creatures[:2])
	}

	jsonC, _ := json.MarshalSafeCollections(creatures)

	_ = os.Mkdir("output", os.ModePerm)
	_ = ioutil.WriteFile("output/creatures.json", jsonC, os.ModePerm)
}
