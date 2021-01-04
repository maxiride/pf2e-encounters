package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"log"
	"strings"
)

func getCreatureDetails(i int, id string) {

	data := getAONCreatures(baseURL + id)

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(data))
	if err != nil {
		fmt.Println("No id found")
		log.Fatal(err)
	}

	rarityAssigned := false
	doc.Find("span").Each(func(index int, selection *goquery.Selection) {
		if selection.HasClass("trait") {
			creatures[i].Traits = append(creatures[i].Traits, selection.Text())
		}
		// I expected common and unique creatures to have the class traitcommon and traitunique, instead
		// common creatures do not have the span at all while unique ones have the span class traitrare
		if !rarityAssigned {
			if selection.HasClass("traituncommon") || selection.HasClass("traitrare") {
				creatures[i].Rarity = selection.Text()
				rarityAssigned = true
			} else {
				creatures[i].Rarity = "Common"
			}
		}

		// Get the the creature's lore
		if selection.AttrOr("id", "") == "ctl00_MainContent_DetailedOutput" {
			lore := selection.Text()
			lore = lore[:strings.Index(lore, "Creature ")]
			creatures[i].Lore = lore
		}
	})

}
