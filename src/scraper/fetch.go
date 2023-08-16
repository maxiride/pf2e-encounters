package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
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

func (d *Data) parseAONTable(data string) {

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
					level, err := strconv.Atoi(tablecell.Text())
					if err != nil {
						level = -999
					}
					c.Level = level
				case 3:
					c.Alignment = tablecell.Text()
				case 4:
					c.CreatureType = tablecell.Text()
				case 5:
					c.Size = tablecell.Text()
				}

			})
			d.Creatures = append(d.Creatures, c)
		})
	})

	// Drop first entry which is the table header row
	d.Creatures = d.Creatures[1:]
}
