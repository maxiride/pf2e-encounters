package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

func getAONCreatures(url string) string {

	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Can't get AON data: %s", err)
		return ""
	}

	bodyBytes, _ := ioutil.ReadAll(resp.Body)

	return string(bodyBytes)
}

func parseAONTable(data string) {

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(data))
	if err != nil {
		fmt.Println("No id found")
		log.Fatal(err)
	}

	// Find each table
	doc.Find("table").Each(func(index int, tablehtml *goquery.Selection) {
		tablehtml.Find("tr").Each(func(indextr int, rowhtml *goquery.Selection) {
			c := Creature{}
			rowhtml.Find("td").Each(func(indexth int, tablecell *goquery.Selection) {
				switch indexth {
				case 0:
					c.name = tablecell.Text()
					id := getCreatureID(tablecell.Html())
					c.id = id
				case 1:
					c.family = tablecell.Text()
				case 2:
					c.level = tablecell.Text()
				case 3:
					c.alignment = tablecell.Text()
				case 4:
					c.creatureType = tablecell.Text()
				case 5:
					c.size = tablecell.Text()
				}

			})
			creatures = append(creatures, c)
		})
	})

	// Drop first entry which is the table header row
	creatures = creatures[1:]
}

// TODO this is a peasant approach, goquery con proably do it all. Gotta look better in its API
func getCreatureID(html string, err error) string {

	// Example URL to parse Monsters.aspx?ID=799
	// we just want the ID
	index := strings.LastIndex(html, "=")
	id := html[index+1 : index+4]

	return id
}

var creatures []Creature

type Creature struct {
	name         string
	family       string
	level        string
	alignment    string
	creatureType string
	size         string
	traits       []string
	id           string
}
