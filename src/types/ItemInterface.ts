export default interface ItemInterface {
    name: string,
    description: string,
    image: string,
    link: string,
    // Set by App.vue's staggered entrance timers, so absent in the source data.
    show?: boolean,
}
