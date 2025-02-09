<template>
  <TransitionRoot v-if="item"
                  :show="!!item.show"
                  enter="transition duration-300 ease-out"
                  enter-from="translate-x-4 opacity-0"
                  enter-to="translate-x-0 opacity-100"
  >
    <a :href="item.link || 'javascript:void(0);'"
       class="relative flex bg-white px-4 py-2 rounded-2xl h-40 shadow-md origin-center transform-gpu transition-transform ease-in-out duration-200 hover:scale-105 hover:rotate-1 hover:z-10"
       target="_blank"
    >
      <TransitionChild as="template"
                       enter="transition duration-500 ease-out"
                       enter-from="rotate-45 scale-70 opacity-0"
                       enter-to="rotate-0 scale-100 opacity-100"
      >
        <img class="absolute w-24 sm:w-44 top-4 sm:-top-6 -left-5 sm:-left-9 rounded-full drop-shadow-xl" :src="`/assets/${item.image || 'site_logo.jpg'}`" alt="Icon" />
      </TransitionChild>
      <div class="ml-16 sm:ml-32 h-full flex-grow flex flex-col">
        <TransitionChild as="template"
                         enter="transition duration-500 ease-out"
                         enter-from="translate-x-12 opacity-0"
                         enter-to="translate-x-0 opacity-100"
        >
          <h2 class="font-calistoga text-lg sm:text-2xl mb-1">{{ item.name }}</h2>
        </TransitionChild>
        <div class="text-sm sm:text-base pl-2 h-full min-h-0 border-l-4 border-gray-300">
          <TransitionChild as="template"
                           enter="transition duration-500 ease-out"
                           enter-from="translate-x-12 opacity-0"
                           enter-to="translate-x-0 opacity-100"
          >
            <div class="h-full overflow-hidden whitespace-pre-wrap">{{ item.description }}</div>
          </TransitionChild>
        </div>
      </div>
      <div class="flex items-end">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  </TransitionRoot>
</template>

<script lang="ts">
import ItemInterface from "../types/ItemInterface";
import { TransitionRoot, TransitionChild } from "@headlessui/vue";
import {defineComponent, PropType} from "vue";

export default defineComponent({
  name: "Item",
  components: {
    TransitionRoot,
    TransitionChild
  },
  props: {
    item: {
      type: Object as PropType<ItemInterface>,
      required: false,
    }
  }
})
</script>
