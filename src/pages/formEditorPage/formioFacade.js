const { Formio, Templates, Utils } = require('formiojs');
const path = require('path');
const clearNode = require('../../util/clearNode');
const $ = require('jquery');
const initJQueryNotify = require('../../../libs/notify');
const isComponent = require('../../util/isComponent');
const { customComponents } = require('hes-formio-components');
const customComponentsKeys = Object.keys(customComponents);

if (!$.notify) {
    initJQueryNotify();
}
class FormioFacade {
    constructor(builderContainer, formContainer, options = {}) {
        this.onSchemaChanged = options.onSchemaChanged;
        this.onSubmit = options.onSubmit;
        this.builderContainer = builderContainer;
        this.formContainer = formContainer;
        this.customComponentNames = new Set();
        if (options.getForms && options.getFormById && options.getActiveFormPath) {
            this._overrideMakeRequest(options.getForms, options.getFormById, options.getActiveFormPath);
        }
    }

    get builderOptions() {
        const customComponentNames = [...this.customComponentNames.values()];
        if (customComponentNames.length) {
            const components = customComponentNames.reduce((components, name) => {
                components[name] = true;
                return components;
            }, {})
            return {
                builder: {
                    custom: {
                        title: 'Custom Components',
                        default: false,
                        weight: 100,
                        components
                    }
                }
            }
        }
        return {};
    }

    get customComponentsFronLibruaryOptions() {
        if (customComponentsKeys.length) {
            const components = customComponentsKeys.reduce((init, module) => {
                return { ...init, [module]: true };
            }, {});
    
            return {
                builder: {
                    ...components
                },
            };
        } else {
            return {};
        }
    }

    _overrideMakeRequest(getForms, getFormById, getActiveFormPath) {
        const baseUrl = 'http://localhost';
        const regExp = new RegExp('^' + baseUrl + '/form');
        const regExp2 = new RegExp('^' + baseUrl + '/form/(.*)[/\?$]');
        function _overrideFormioRequest(fn) {
            return async function (...args) {
                const _baseUrl = args[2];
                if (regExp2.test(_baseUrl)) {
                    const id = _baseUrl.match(regExp2)[1];
                    const form = await getFormById(id);
                    return form;
                }
                if (regExp.test(_baseUrl)) {
                    const subForms = await getForms();
                    const path = getActiveFormPath();
                    return subForms.filter(subForm => subForm.path !== path);
                }
                return fn.apply(this, args);
            }
        }
        Formio.setBaseUrl(baseUrl);
        Formio.makeRequest = _overrideFormioRequest(Formio.makeRequest);
    }

    _registerComponent(componentDetails = {}) {
        const { path, name } = componentDetails;
        try {
            const CustomComponent = require(path);
            if (!isComponent(CustomComponent, name)) {
                throw new Error('Not valid custom component');
            }
            Formio.registerComponent(name, CustomComponent);
            this.customComponentNames.add(name);
            return true;
        } catch (err) {
            console.info(err);
            return false;
        }
    }

    registerComponents(componentsDetails) {
        const registeredComponents = componentsDetails.filter(componentDetails => this._registerComponent(componentDetails));
        if (registeredComponents.length !== componentsDetails.length) {
            componentsDetails.forEach(componentDetails => {
                if (!registeredComponents.some(component => component.path === componentDetails.path)) {
                    $.notify(`${path.basename(componentDetails.path)} is not valid!`);
                }
            })
        }
    }

    registerCustomComponentsFromLibruary() {
        if (customComponentsKeys.length) {
            customComponentsKeys.forEach((module) => {
                Formio.registerComponent(module, customComponents[module]);
                Formio.use(customComponents[module]);
            });
        }
    }

    attachBuilder(schema, options = {}) {

        const template = `
        <div class="mb-2">
        <button
            class="btn btn-primary btn-md"
            ref="header"
        >
            <span>
                {{ctx.component.buttonName || "Button"}}
            </span>
        </button>
        
        {% if (ctx.collapsed || ctx.builder) { %}
        <div class="card-body dropdownContainer" ref="{{ctx.nestedKey}}" id="{{ctx.instance.id}}-{{ctx.component.key}}" style="background: #ffffff;top: 57px;">
            {{ctx.children}}
        </div>
        {% } %}
        </div>`;

        const compiledForm = Utils.Evaluator.template(template, 'dropDownComponent');

        const formioDropdownComponentCustomTemplate = (ctx) => {
            return compiledForm(ctx);
        };

        Templates.current = {
            dropDownTemplate: {
                form: formioDropdownComponentCustomTemplate,
            }
        };
        this.registerCustomComponentsFromLibruary();

        Formio.builder(this.builderContainer, schema, {...options, ...this.customComponentsFroLibruaryOptions, showFullJsonSchema: true }).then(builderInstance => {
            this.builder = builderInstance;
            if (this.onSchemaChanged) {
                this.builder.on('render', () => {
                    this.onSchemaChanged(this.builder.schema);
                });

                if(e.hasOwnProperty('type')) {
                    this.onSchemaChanged(e);
                } else {
                    this.onSchemaChanged(this.builder.schema);
                }
            }
        })
    }

    attachForm(schema = {}, options = {}) {
        Formio.createForm(this.formContainer, schema, options).then(rendererInstance => {
            this.form = rendererInstance;
            this.form.nosubmit = true;
            if (this.onSubmit) {
                this.form.on('submit', submission => {
                    this.onSubmit(submission);
                    this.form && this.form.emit('submitDone', submission);
                });
            }
        })
    }

    detachBuilder() {
        this._unsubscribeBuilderEvents();
        clearNode(this.builderContainer);
    }

    detachForm() {
        this._unsubscribeSubmit();
        clearNode(this.formContainer);
    }

    unsubscribe() {
        this._unsubscribeBuilderEvents();
        this._unsubscribeSubmit();
    }

    _unsubscribeBuilderEvents() {
        if (this.builder) {
            this.builder.off('render');
            this.builder.off('change');
        }
    }

    _unsubscribeSubmit() {
        this.form && this.form.off('submit');
    }
}

module.exports = FormioFacade;