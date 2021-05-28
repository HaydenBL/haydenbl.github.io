<template>
  <div class="p-20 flex space-x-12">
    <Item v-for="project in projects" :key="project.name" :item="project" />
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
          name: `QuiQuote`,
          description: `An Android app for saving and sharing quotes.`,
          image: `/img/QuiQuote.png`,
          link: `https://play.google.com/store/apps/details?id=se.haydenblai.quiquote`,
        },
        {
          name: `Other`,
          description: `Blah blah bunch of stuff`,
          image: `/img/QuiQuote.png`,
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
