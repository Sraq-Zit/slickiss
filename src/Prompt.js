/** Class presenting a custom prompt */
class Prompt {

    /**
     * Initialize handlers and context, you need to load message components by calling load method
     * @param {JQuery|Document|HTMLElement} context 
     * @param {(e: JQuery.ClickEvent) => void} yes 
     * @param {(e: JQuery.ClickEvent) => void} no 
     */
    constructor(yes, no, context) {
        (typeof yes == 'function' && (this.onYes = yes)) || (this.onYes = e => e);
        (typeof no == 'function' && (this.onNo = no)) || (this.onNo = e => e);

        this.context = $('body');

        if (context instanceof Document) context = context.find('body');

        if (context instanceof jQuery || context instanceof HTMLElement)
            this.context = $(context);
    }

    /** Load components
     * @returns {Promise<this>}
     */
    async load() {
        let html = await Assets.loadAssetFromFile('/prompt.html');
        html = html.replace(/msgArea/gs, 'msgArea_' + Prompt.counter++);
        this.container = $(html).hide();
        this.context.prepend(this.container);
        this.bigTitle = this.container.find('.bigTitle');
        this.subTitle = this.container.find('.subTitle');
        this.yes = this.container.find('.yes');
        this.no = this.container.find('.no');

        this.yes.on('click', e => this.onYes(e));
        this.no.on('click', e => this.onNo(e));

        this.yes.add(this.no).on('click', e => this.destroyable && this.destroy());

        return this;
    }

    /** Displays prompt
     * @returns {this}
     */
    show() {
        this.container.fadeIn();
        this.yes[0].focus();
        return this;
    }

    /** Fades out the prompt and destroys it */
    destroy() {
        this.container.fadeOut(500, e => this.container.remove());
    }


    /**
     * Context within which the message will appear
     * @type {JQuery<HTMLElement>}
     * @default body
     */
    context;

    /** Container of the whole package
     * @type {JQuery<HTMLDivElement>}
     **/
    container;

    /** The header of the message
     * @type {JQuery<HTMLSpanElement>}
     **/
    bigTitle;

    /** Smaller header of the message
     * @type {JQuery<HTMLDivElement>}
     **/
    subTitle;

    /** Yes button
     * @type {JQuery<HTMLTableDataCellElement>}
     **/
    yes;

    /** No button
     * @type {JQuery<HTMLTableDataCellElement>}
     **/
    no;

    /** Whether to destroy after the answer is chosen
     * @type {boolean}
     * @default true
     **/
    destroyable = true;

    /** Event handler when comfirmed
     * @type {() => void}
     */ onYes = () => console.warn('Comfirmation not handled');


    /** Event handler when declined
     * @type {() => void}
     */ onNo = () => console.warn('Comfirmation not handled');

    /** Counter for identifying message divs
     * @type {number}
     */ static counter = 0;
}