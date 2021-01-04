package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"log"
	"strings"
)

func getCreature(i int, id string) {

	data := getAONCreatures(baseURL + id)

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(data))
	if err != nil {
		fmt.Println("No id found")
		log.Fatal(err)
	}

	doc.Find("span").Each(func(index int, selection *goquery.Selection) {
		if selection.HasClass("trait") {
			creatures[i].traits = append(creatures[i].traits, selection.Text())
		}
	})

}
