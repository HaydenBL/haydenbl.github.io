<template>
  <div class="px-8 py-6">
    <div class="grid grid-flow-row grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-12 max-w-screen-2xl m-auto">
      <Item v-for="project in projects" :key="project.name" :item="project" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import Item from "./components/Item.vue";
import ItemInterface from "./types/ItemInterface";

export default defineComponent({
  name: 'App',
  components: {
    Item,
    HelloWorld
  },
  data(): {
    projects: Array<ItemInterface>
  } {
    return {
      projects: [
        {
          name: `haydenblai.se`,
          description: `Blah blah bunch of stuff and things`,
          image: `site_logo.png`,
          link: `https://play.google.com/store/apps/details?id=se.haydenblai.quiquote`,
        },
        {
          name: `QuiQuote`,
          description: `An Android app for saving and sharing quotes.`,
          image: `quiquote.png`,
          link: `https://play.google.com/store/apps/details?id=se.haydenblai.quiquote`,
        },
        {
          name: `Other`,
          description: `Blah blah bunch of stuff and things`,
          image: `twitter.png`,
          link: `https://play.google.com/store/apps/details?id=se.haydenblai.quiquote`,
        },
      ]
    }
  },
})
</script>

<style>
#app {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
