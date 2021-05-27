<template>

  <a href="https://play.google.com/store/apps/details?id=se.haydenblai.quiquote" class="relative flex-shrink-0 flex bg-white px-4 py-2 rounded-2xl w-120 h-40 shadow-md origin-center transform transition-transform ease-in-out duration-200 hover:scale-110" target="_blank">
    <img class="absolute w-44 -top-6 -left-9" src="/public/quiquote.png" />
    <div class="ml-32 h-full flex flex-col">
      <div class="font-calistoga text-2xl mb-1">QuiQuote</div>
      <div class="text-base pl-2 h-full border-l-4 border-gray-300">
        <div>An Android app for saving and sharing quotes.</div>
      </div>
    </div>
    <div class="flex items-end">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </div>
  </a>

</template>

<script>
export default {
  name: "Item"
}
</script>
