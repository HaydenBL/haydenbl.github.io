export default interface ItemInterface {
    name: string,
    description: string,
    image: string,
    link: string,
    // What the thing is, in two words, for the card's footer. Optional: a card
    // without one just renders the link label on its own.
    kind?: string,
    // Set by App.vue's staggered entrance timers, so absent in the source data.
    show?: boolean,
}
