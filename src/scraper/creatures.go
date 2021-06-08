package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/PuerkitoBio/goquery"
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

		// Get the the creature's lore and image URL
		if selection.AttrOr("id", "") == "ctl00_MainContent_DetailedOutput" {
			lore := selection.Text()
			lore = lore[:strings.Index(lore, "Creature ")]
			d.Creatures[i].Lore = lore

			/*
				Get the creature's thumbnail image if it is in the expected node,
				imediately after the name of the creature h,
				Not all creatures has it.
				TODO check if it is in the same positions for all creatures.

				Image URL is relative to domain: https://2e.aonprd.com/
				Es: https://2e.aonprd.com/Images/Monsters/Serpentfolk_AapophSerpentfolk.png
			*/

			selection.Children().EachWithBreak(func(j int, s *goquery.Selection) bool {
				if s.HasClass("title") {

					if s.Next().Children().AttrOr("class", "") == "thumbnail" {
						imageURL, _ := s.Next().Children().Attr("src")
						d.Creatures[i].ImgURL = imageURL
						return (false)
					}
				}
				return true
			})

		}

	})

}
