<template>
  <div class="p-20 bg-gray-100 flex space-x-16">
    <Item/>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import Item from "./components/Item.vue";

export default defineComponent({
  name: 'App',
  components: {
    Item,
    HelloWorld
  }
})
</script>

<style>
#app {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
