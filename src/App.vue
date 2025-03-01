<template>

  <Header></Header>

  <div class="mt-64 md:mt-72 lg:mt-96 p-2 sm:p-8">

    <div class="px-2 sm:px-8 py-6">
      <div class="grid grid-flow-row grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-12 max-w-screen-2xl m-auto">
        <Item v-for="project in projects" :key="project.name" :item="project" />
      </div>
    </div>

  </div>

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
  created() {
    const INITIAL_DELAY = 350;
    const ITEM_DELAY = 70;
    for (let i in this.projects) {
      setTimeout(() => this.projects[i].show = true, +i * ITEM_DELAY + INITIAL_DELAY);
    }
  },
  data() {
    return {
      projects: [
        {
          name: `haydenblai.se`,
          description: `Source code for this website. Written in Vue and styled with Tailwind CSS.`,
          image: `site_logo.jpg`,
          link: `https://github.com/HaydenBL/haydenbl.github.io`,
        },
        {
          name: `midi2smw`,
          description: `Converts MIDI files to MML so it can be inserted into Super Mario World romhacks.`,
          image: `midi2smw.jpg`,
          link: `https://github.com/HaydenBL/midi2smw`,
        },
        {
          name: `VSCO Photo Downloader`,
          description: `Online tool for scraping photos from VSCO.`,
          image: `vsco-dler.jpg`,
          link: `https://github.com/HaydenBL/vsco-dler`,
        },
        {
          name: `QuiQuote`,
          description: `An Android app for saving and sharing quotes.`,
          image: `quiquote.jpg`,
          link: `https://github.com/HaydenBL/QuiQuote`,
        },
        {
          name: `Euclidean Calculator`,
          description: `Simple webapp for calculating a Greatest Common Divisor using Euclid's method. Written while procrastinating math homework.`,
          image: `eucal.jpg`,
          link: `/euclidean-calc`,
        },
        {
          name: `Quora Clone`,
          description: `An old PHP project for a web and database class project in university. It's very bad!`,
          image: `quora.jpg`,
          link: `https://github.com/HaydenBL/Quora-Clone`,
        },
      ] as ItemInterface[]
    }
  },
})
</script>
