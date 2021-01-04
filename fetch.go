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
					c.Name = tablecell.Text()
					str := tablecell.Find("a").AttrOr("href", "")
					equalIndex := strings.LastIndex(str, "=")
					c.Id = str[equalIndex+1:]
				case 1:
					c.Family = tablecell.Text()
				case 2:
					c.Level = tablecell.Text()
				case 3:
					c.Alignment = tablecell.Text()
				case 4:
					c.CreatureType = tablecell.Text()
				case 5:
					c.Size = tablecell.Text()
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
	Name         string   `json:"name"`
	Family       string   `json:"family"`
	Level        string   `json:"level"`
	Alignment    string   `json:"alignment"`
	CreatureType string   `json:"creature_type"`
	Size         string   `json:"size"`
	Traits       []string `json:"traits"`
	Rarity       string   `json:"rarity"`
	Id           string   `json:"id"`
}
