/**
 * Registers extended Data Grid and Panel components with a "Linked Fetch Component"
 * builder setting (schema key: linkedFetchComponent).
 */

function createLinkedFetchComponentField(containerLabel) {
    return {
        type: 'select',
        input: true,
        key: 'linkedFetchComponent',
        label: 'Linked Fetch Component',
        weight: 200,
        tooltip: `When this Fetch component fires a request, a loader overlay appears on the ${containerLabel}.`,
        placeholder: 'None',
        dataSrc: 'custom',
        valueProperty: 'value',
        data: {
            custom(context) {
                const values = [{ label: 'None', value: '' }];
                context.utils.eachComponent(
                    context.instance.options.editForm.components,
                    (component, path) => {
                        if (component.type === 'refreshComponent') {
                            values.push({
                                label: `${component.label || component.key} (${path})`,
                                value: component.key,
                            });
                        }
                    },
                );
                return values;
            },
        },
    };
}

function registerDatagridOverride(Formio) {
    const baseEditForm = require('formiojs/components/_classes/component/Component.form').default;
    const DatagridBase = require('formiojs/components/datagrid/DataGrid').default;
    const DataGridEditDisplay = require('formiojs/components/datagrid/editForm/DataGrid.edit.display').default;
    const DataGridEditData = require('formiojs/components/datagrid/editForm/DataGrid.edit.data').default;
    const DataGridEditValidation = require('formiojs/components/datagrid/editForm/DataGrid.edit.validation').default;

    class DatagridWithFetchLink extends DatagridBase {}
    DatagridWithFetchLink.editForm = function (...extend) {
        return baseEditForm(
            [
                {
                    key: 'display',
                    components: [...DataGridEditDisplay, createLinkedFetchComponentField('Data Grid')],
                },
                { key: 'data', components: DataGridEditData },
                { key: 'validation', components: DataGridEditValidation },
            ],
            ...extend,
        );
    };
    Formio.registerComponent('datagrid', DatagridWithFetchLink);
}

function registerPanelOverride(Formio) {
    const nestedBaseEditForm = require('formiojs/components/_classes/nested/NestedComponent.form').default;
    const PanelBase = require('formiojs/components/panel/Panel').default;
    const PanelEditDisplay = require('formiojs/components/panel/editForm/Panel.edit.display').default;
    const PanelEditConditional = require('formiojs/components/panel/editForm/Panel.edit.conditional').default;

    class PanelWithFetchLink extends PanelBase {}
    PanelWithFetchLink.editForm = function (...extend) {
        return nestedBaseEditForm(
            [
                {
                    key: 'display',
                    components: [...PanelEditDisplay, createLinkedFetchComponentField('Panel')],
                },
                { key: 'conditional', components: PanelEditConditional },
                { key: 'addons', ignore: true },
            ],
            ...extend,
        );
    };
    Formio.registerComponent('panel', PanelWithFetchLink);
}

function registerLinkedFetchOverrides(Formio) {
    registerDatagridOverride(Formio);
    registerPanelOverride(Formio);
}

module.exports = {
    createLinkedFetchComponentField,
    registerDatagridOverride,
    registerLinkedFetchOverrides,
    registerPanelOverride,
};
