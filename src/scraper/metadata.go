package main

import (
	"github.com/campoy/unique"
)

func (d *Data) FillMetadata() {

	d.Metadata.Total = len(d.Creatures)

	for _, k := range d.Creatures {

		level := k.Level

		if level < d.Metadata.MinLevel {
			d.Metadata.MinLevel = level
		}

		if level > d.Metadata.MaxLevel {
			d.Metadata.MaxLevel = level
		}

		d.Metadata.Alignments = append(d.Metadata.Alignments, k.Alignment)
		d.Metadata.Families = append(d.Metadata.Families, k.Family)
		d.Metadata.CreatureTypes = append(d.Metadata.CreatureTypes, k.CreatureType)
		d.Metadata.Rarities = append(d.Metadata.Rarities, k.Rarity)
		d.Metadata.Sizes = append(d.Metadata.Sizes, k.Size)

		for _, j := range k.Traits {
			d.Metadata.Traits = append(d.Metadata.Traits, j)
		}

	}

	unique.Slice(&d.Metadata.Alignments, func(i, j int) bool {
		return d.Metadata.Alignments[i] < d.Metadata.Alignments[j]
	})
	unique.Slice(&d.Metadata.Families, func(i, j int) bool {
		return d.Metadata.Families[i] < d.Metadata.Families[j]
	})
	unique.Slice(&d.Metadata.CreatureTypes, func(i, j int) bool {
		return d.Metadata.CreatureTypes[i] < d.Metadata.CreatureTypes[j]
	})
	unique.Slice(&d.Metadata.Rarities, func(i, j int) bool {
		return d.Metadata.Rarities[i] < d.Metadata.Rarities[j]
	})
	unique.Slice(&d.Metadata.Traits, func(i, j int) bool {
		return d.Metadata.Traits[i] < d.Metadata.Traits[j]
	})
	unique.Slice(&d.Metadata.Sizes, func(i, j int) bool {
		return d.Metadata.Sizes[i] < d.Metadata.Sizes[j]
	})

}
