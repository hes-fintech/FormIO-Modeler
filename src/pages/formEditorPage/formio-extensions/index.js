/**
 * Form.io registrations and builder extensions used by the form editor.
 *
 * Add a new extension: implement `function register(Formio) { ... }`, require it
 * below, and append it to `extensionRegistrars`.
 */

const { registerLinkedFetchOverrides } = require('./linkedFetchOverrides');

/** @type {Array<(formio: import('formiojs').Formio) => void>} */
const extensionRegistrars = [registerLinkedFetchOverrides];

function registerFormioExtensions(Formio) {
    extensionRegistrars.forEach((register) => register(Formio));
}

module.exports = {
    registerFormioExtensions,
    extensionRegistrars,
    ...require('./linkedFetchOverrides'),
};
