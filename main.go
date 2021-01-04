package main

import (
	"fmt"
	"github.com/davecgh/go-spew/spew"
	"os"
)

// baseURL for creatures pages
const baseURL = "https://2e.aonprd.com/Monsters.aspx?ID="

func main() {
	// FIXME hardcoded id, should be .env for good practices
	url := "https://2e.aonprd.com/Monsters.aspx?Letter=All"

	creaturesMainTable := getAONCreatures(url)
	parseAONTable(creaturesMainTable)

	for i, c := range creatures {
		getCreature(i, c.id)
		if os.Getenv("DEBUG") == "1" && i == 3{
			break
		}
	}


	// Pretty print the result, DEBUG only
	if os.Getenv("DEBUG") == "1" {
		fmt.Printf("Found %i creatures\n", len(creatures))
		// Just spew a bunch of them, we don't need to check them all!
		spew.Dump(creatures[:2])

	}
}
