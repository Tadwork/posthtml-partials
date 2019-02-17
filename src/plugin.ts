'use strict';

import { INode, IAttributes, ITree } from 'posthtml';
import expandPlaceholder from 'expand-placeholder';

const { walk } = require('posthtml/lib/api');

let delimiters: string[];

export interface IOptions {
	// Array containing beginning and ending delimiters for escaped locals
	delimiters: string[];
}

interface IAttribute {
	name: string;
	value: string;
}

interface IPartial {
	params: IAttribute[];
	body: (string | INode)[];
}

interface IPartialStorage {
	[name: string]: IPartial[];
}

function makeParams(attrs: IAttributes): IAttribute[] {
	const params: IAttribute[] = [];
	Object.keys(attrs).forEach((attr) => {
		if (attr === 'name') {
			return;
		}

		params.push({
			name: attr,
			value: attrs[attr] !== '' ? attrs[attr] : null
		});
	});

	return params;
}

function makePartialDefinition(node: INode): IPartial {
	return {
		params: makeParams(node.attrs),
		body: node.content
	};
}

function replaceExpression(str: string, params: IAttributes): string {
	return expandPlaceholder(str, params, {
		opening: delimiters[0],
		closing: delimiters[1]
	});
}

function replaceExpressions(tree: INode[], params: IAttributes): INode[] {
	return walk.call(tree, (node) => {
		if (typeof node === 'object') {
			if (node.attrs) {
				Object.keys(node.attrs).forEach((name) => {
					node.attrs[name] = replaceExpression(node.attrs[name], params);
				});
			}
		} else if (typeof node === 'string') {
			node = replaceExpression(node, params);
		}

		return node;
	});
}

function makePartialReference(node: INode, storage: IPartialStorage): INode {
	const name = node.attrs.name;
	const referenceParams = makeParams(node.attrs);

	// Try to find Partial with specified parameters
	let Partial: IPartial;
	const keys = Object.keys(storage);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (key !== name) {
			continue;
		}

		// Each Partial can have multiple reloadings, depending on the number of parameters
		const setOfPartials = storage[key];
		for (let j = setOfPartials.length - 1; j >= 0; j--) {
			const maybe = setOfPartials[j];

			let status = true;
			if (maybe.params.length !== 0 && maybe.params.length !== referenceParams.length) {
				// Check balance of arguments. If Partial has free parameters without default values then skip this Partial
				const freeParams = maybe.params.filter((param) => {
					for (let k = 0; k < referenceParams.length; k++) {
						if (referenceParams[k].name === param.name || param.value !== null) {
							return false;
						}
					}

					return true;
				});

				if (freeParams.length !== 0) {
					status = false;
				}
			}

			if (status) {
				Partial = maybe;
				break;
			}
		}
	}

	if (!Partial) {
		throw new Error(`The Partial with name "${name}" does not exist`);
	}

	// Prepare parameters to call Partial
	const callParams: IAttributes = {};
	Partial.params.forEach((param) => {
		if (referenceParams.length === 0) {
			callParams[param.name] = param.value;
			return;
		}

		for (let i = 0; i < referenceParams.length; i++) {
			const refParam = referenceParams[i];
			if (param.name === refParam.name) {
				callParams[param.name] = refParam.value;
			} else {
				callParams[refParam.name] = refParam.value;
			}
		}

		if (!callParams[param.name]) {
			callParams[param.name] = param.value;
		}
	});

	return {
		tag: false,
		content: replaceExpressions(<INode[]>JSON.parse(JSON.stringify(Partial.body)), callParams),
		attrs: null
	};
}

export default function posthtmlPartials(options?: IOptions) {
	const storage: IPartialStorage = {};

	const opts = Object.assign(<IOptions>{
		delimiters: ['{{', '}}']
	}, options);

	delimiters = opts.delimiters;

	return (tree?: ITree) => {
		tree.match({ tag: 'partial' }, (node) => {
			// Skip tag if it doesn't contain attributes or `name` attribute
			if (!node.attrs || (node.attrs && !node.attrs.name)) {
				return node;
			}

			// Name of Partial
			const name = node.attrs.name;

			// Partial reference
			if (!node.content || (node.content && (node.content.length === 0 || (node.content.length === 1 && node.content[0] === '')))) {
				// Partial with specified name exists?
				if (!node.content && !storage[name]) {
					throw new Error(`The Partial with name "${name}" does not exist`);
				}

				return makePartialReference(node, storage);
			}

			// Partial definition
			if (node.content && node.content.length !== 0) {
				if (!storage[name]) {
					storage[name] = [];
				}

				storage[name].push(makePartialDefinition(node));

				return {
					tag: false,
					content: [],
					attrs: null
				};
			}
		});

		return tree;
	};
}
