package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"log"
	"strings"
)

func (d *Data) getCreatureDetails(i int, id string) {

	rawData := getAONCreatures(baseURL + id)

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(rawData))
	if err != nil {
		fmt.Println("No id found")
		log.Fatal(err)
	}

	rarityAssigned := false
	doc.Find("span").Each(func(index int, selection *goquery.Selection) {
		if selection.HasClass("trait") {
			d.Creatures[i].Traits = append(d.Creatures[i].Traits, selection.Text())
		}
		// I expected common and unique creatures to have the class traitcommon and traitunique, instead
		// common creatures do not have the span at all while unique ones have the span class traitrare
		if !rarityAssigned {
			if selection.HasClass("traituncommon") || selection.HasClass("traitrare") {
				d.Creatures[i].Rarity = selection.Text()
				rarityAssigned = true
			} else {
				d.Creatures[i].Rarity = "Common"
			}
		}

		// Get the the creature's lore
		if selection.AttrOr("id", "") == "ctl00_MainContent_DetailedOutput" {
			lore := selection.Text()
			lore = lore[:strings.Index(lore, "Creature ")]
			d.Creatures[i].Lore = lore
		}
		// TODO Get the creature's image
	})

}
