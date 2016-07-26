import {prototypoStore} from '../stores/creation.stores.jsx';
import LocalServer from '../stores/local-server.stores.jsx';
import LocalClient from '../stores/local-client.stores.jsx';
import {FontValues} from '../services/values.services.js';
import HoodieApi from '../services/hoodie.services.js';
import JSZip from 'jszip';

let localServer;
let localClient;

window.addEventListener('fluxServer.setup', () => {
	localClient = LocalClient.instance();
	localServer = LocalServer.instance;
});

export default {
	'/exporting': ({exporting, errorExport}) => {
		const patch = prototypoStore.set('export', exporting).set('errorExport', errorExport).commit();

		localServer.dispatchUpdate('/prototypoStore', patch);
	},
	'/export-otf': ({merged, familyName = 'font', variantName = 'regular', exportAs}) => {
		const plan = HoodieApi.instance.plan;

		//forbid export without plan
		if (plan.indexOf('free_') !== -1) {
			return false;
		}

		localClient.dispatchAction('/exporting', {exporting: true});

		let family;
		let style;

		if (exportAs) {
			family = familyName;
			style = variantName;
		}
		else {
			family = prototypoStore.get('family').name ? prototypoStore.get('family').name.replace(/\s/g, '-') : familyName;
			style = prototypoStore.get('variant').name ? prototypoStore.get('variant').name.replace(/\s/g, '-') : variantName;
		}

		const name = {
			family,
			style: `${style.toLowerCase()}`,
		};

		const exportingError = setTimeout(() => {
			localClient.dispatchAction('/exporting', {exporting: false, errorExport: true});
		}, 10000);

		fontInstance.download(() => {
			localClient.dispatchAction('/store-value', {uiOnboardstep: 'end'});
			localClient.dispatchAction('/exporting', {exporting: false});
			window.Intercom('trackEvent', 'export-otf');
			clearTimeout(exportingError);
		}, name, merged, undefined, HoodieApi.instance.email);
	},
	'/set-up-export-otf': ({merged, exportAs = true}) => {
		const plan = HoodieApi.instance.plan;

		//forbid export without plan
		if (plan.indexOf('free_') !== -1) {
			return false;
		}

		const patch = prototypoStore.set('exportAs', exportAs).set('mergedExportAs', merged).commit();

		localServer.dispatchUpdate('/prototypoStore', patch);
	},
	'/export-glyphr': () => {
		const family = prototypoStore.get('family').name ? prototypoStore.get('family').name.replace(/\s/g, '-') : 'font';
		const style = prototypoStore.get('variant').name ? prototypoStore.get('variant').name.replace(/\s/g, '-') : 'regular';

		const name = {
			family,
			style: `${style.toLowerCase()}`,
		};

		fontInstance.openInGlyphr(null, name, false, undefined, HoodieApi.instance.email);
	},
	'/export-family-from-reader': ({result, familyToExport, template, oldDb}) => {
		const a = document.createElement('a');
		const _URL = window.URL || window.webkitURL;

		a.download = `${familyToExport.name}.zip`;
		a.href = result;
		a.dispatchEvent(new MouseEvent('click'));

		setTimeout(() => {
			a.href = '#';
			_URL.revokeObjectURL(result);
		}, 100);

		fontInstance.exportingZip = false;

		localClient.dispatchAction('/change-font', {
			templateToLoad: template,
			db: oldDb,
		});

		const cleanupPatch = prototypoStore
			.set('variantToExport', undefined)
			.set('exportedVariant', 0)
			.set('familyExported', undefined)
			.commit();

		localServer.dispatchUpdate('/prototypoStore', cleanupPatch);
	},
	'/export-family-from-blob': ({familyToExport, oldDb, blobBuffers, template}) => {
		const zip = new JSZip();

		_.each(blobBuffers, ({buffer, variant}) => {
			const variantPatch = prototypoStore.set('exportedVariant',
				prototypoStore.get('exportedVariant') + 1).commit();

			localServer.dispatchUpdate('/prototypoStore', variantPatch);
			zip.file(`${variant}.otf`, buffer, {binary: true});
		});
		const reader = new FileReader();

		reader.onloadend = () => {
			localClient.dispatchAction('/export-family-from-reader', {
				result: reader.result,
				familyToExport,
				template,
				oldDb,
			});
		};

		reader.readAsDataURL(zip.generate({type: "blob"}));
	},
	'/export-family-from-values': ({familyToExport, valueArray, oldDb, template}) => {
		const blobs = [];
		_.each(valueArray, (value) => {
			const blob = fontInstance.getBlob(
				null, {
					family: familyToExport.name,
					style: value.currVariant.name,
				},
				false,
				value.fontValues.values
			);

			blobs.push(blob.then((blobContent) => {
				return blobContent;
			}));
		});

		Promise.all(blobs).then((blobBuffers) => {
			localClient.dispatchAction('/export-family-from-blob', {
				familyToExport,
				oldDb,
				blobBuffers,
				template,
			});
		});
	},
	'/export-family-after-load': ({familyToExport, variants, oldDb, template}) => {
		const values = [];

		for (let i = 0; i < variants.length; i++) {
			const currVariant = variants[i];

			values.push(FontValues.get({typeface: currVariant.db})
				.then((fontValues) => {
					return {
						currVariant,
						fontValues,
					};
				})
			);
		}


		Promise.all(values).then((valueArray) => {
			localClient.dispatchAction('/export-family-from-values', {
				familyToExport,
				valueArray,
				oldDb,
				template,
			});
		});
	},
	'/export-family': async ({familyToExport, variants}) => {
		const oldVariant = prototypoStore.get('variant');
		const family = prototypoStore.get('family');

		const setupPatch = prototypoStore
			.set('familyExported', familyToExport.name)
			.set('variantToExport', variants.length)
			.commit();

		localServer.dispatchUpdate('/prototypoStore', setupPatch);

		fontInstance.exportingZip = true;
		fontInstance._queue = [];

		localClient.dispatchAction('/change-font', {
			templateToLoad: familyToExport.template,
			db: 'default',
		});

		fontInstance.addOnceListener('worker.fontLoaded', () => {
			localClient.dispatchAction('/export-family-after-load', {
				variants,
				familyToExport,
				oldDb: oldVariant.db,
				template: family.template,
			});

		});
	},
};
