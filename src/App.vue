<template>

  <!--
    The only text statement of whose site this is. The wordmarks in Header.vue
    are raw <path> geometry with no text alternative, so without this the page
    has no <h1> and never names its owner in a machine-readable way.
  -->
  <h1 class="sr-only">Hayden Blaise Lueck</h1>

  <Header></Header>

  <main class="mt-64 md:mt-72 lg:mt-96 px-6 py-2 sm:p-8">

    <div class="px-2 sm:px-8 py-6">
      <div class="grid grid-flow-row grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-12 max-w-(--breakpoint-2xl) m-auto">
        <Item v-for="project in projects" :key="project.name" :item="project" />
      </div>
    </div>

  </main>

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Header from "./components/Header.vue"
import Item from "./components/Item.vue";
import ItemInterface from "./types/ItemInterface";

export default defineComponent({
  name: 'App',
  components: {
    Header,
    Item,
  },
  // No entrance timers here any more. Each card reveals itself when it is
  // actually scrolled into view (see useReveal) — a fixed ladder from here spent
  // four of the six entrances below the fold on a phone, where the grid is one
  // column and only two and a half cards are ever on screen at load.
  data(): { projects: ItemInterface[] } {
    return {
      projects: [
        {
          name: `haydenblai.se`,
          description: `Source code for this website. Written in Vue and styled with Tailwind CSS.`,
          image: `site_logo.jpg`,
          kind: `Website`,
          link: `https://github.com/HaydenBL/haydenbl.github.io`,
        },
        {
          name: `midi2smw`,
          description: `Converts MIDI files to MML so it can be inserted into Super Mario World romhacks.`,
          image: `midi2smw.jpg`,
          kind: `Converter`,
          link: `https://github.com/HaydenBL/midi2smw`,
        },
        {
          name: `VSCO Photo Downloader`,
          description: `Online tool for scraping photos from VSCO.`,
          image: `vsco-dler.jpg`,
          kind: `Web tool`,
          link: `https://github.com/HaydenBL/vsco-dler`,
        },
        {
          name: `QuiQuote`,
          description: `An Android app for saving and sharing quotes.`,
          image: `quiquote.jpg`,
          kind: `Android app`,
          link: `https://github.com/HaydenBL/QuiQuote`,
        },
        {
          name: `Euclidean Calculator`,
          description: `Simple webapp for calculating a Greatest Common Divisor using Euclid's method. Written while procrastinating math homework.`,
          image: `eucal.jpg`,
          kind: `Web app`,
          link: `/euclidean-calc/`,
        },
        {
          name: `Quora Clone`,
          description: `An old PHP project for a university web and database assignment. It's very bad!`,
          image: `quora.jpg`,
          kind: `Coursework`,
          link: `https://github.com/HaydenBL/Quora-Clone`,
        },
      ]
    }
  },
})
</script>
