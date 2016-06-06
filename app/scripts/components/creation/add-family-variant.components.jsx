import React from 'react';
import ReactDOM from 'react-dom';
import Classnames from 'classnames';
import Lifespan from 'lifespan';

import LocalClient from '~/stores/local-client.stores.jsx';
import Log from '~/services/log.services.js';

import Button from '../shared/button.components.jsx';
import SelectWithLabel from '../shared/select-with-label.components.jsx';

export class AddFamily extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			fonts: [],
		};
	}

	async componentWillMount() {
		this.client = LocalClient.instance();
		this.lifespan = new Lifespan();
		const templateList = await this.client.fetch('/templateList');

		this.client.getStore('/fontLibrary', this.lifespan)
		.onUpdate(({head}) => {
				if (head.toJS().errorAddFamily !== this.state.error) {
					this.setState({
						error: head.toJS().errorAddFamily,
					});
				}
				if (head.toJS().errorAddFamily === undefined) {
					this.setState({
						showForm: false,
						selectedFont: undefined,
						reset: (new Date()).getTime(),
					});
				}
			})
			.onDelete(() => {
				this.setState({
					error: undefined,
				});
			});

		this.setState({
			fonts: templateList.get('list'),
		});
	}

	componentWillUnmount() {
		this.client.dispatchAction('/clear-error-family');

		this.lifespan.release();
	}

	toggleForm(e, state) {
		e.stopPropagation();
		this.setState({
			error: undefined,
			showForm: state,
		});

		if (state) {
			this.client.dispatchAction('/store-panel-param', {onboardstep: 'creatingFamily-2'});
			setTimeout(() => {
				this.refs.name.focus();
			}, 100);
		}
	}

	selectFont(font) {
		this.setState({
			selectedFont: font,
		});
	}

	exit() {
		this.client.dispatchAction('/close-create-family-modal', {});
	}

	createFont(e) {
		e.stopPropagation();
		this.client.dispatchAction('/create-family', {
			name: this.refs.name.value,
			template: this.state.selectedFont ? this.state.selectedFont.templateName : undefined,
			loadCurrent: this.state.selectedFont ? this.state.selectedFont.loadCurrent : false,
		});
		Log.ui('Collection.CreateFamily');
		this.client.dispatchAction('/store-panel-param', {onboardstep: 'customize'});
		this.client.dispatchAction('/close-create-family-modal', {});
	}

	render() {

		const familyClass = Classnames({
			'add-family': true,
			'with-error': !!this.state.error,
		});

		const templateList = _.map(this.state.fonts, (font) => {
			return (
				<FamilyTemplateChoice
					key={font.name}
					selectedFont={this.state.selectedFont}
					font={font}
					chooseFont={(selectedFont) => {this.selectFont(selectedFont);}}/>
			);
		});

		const error = this.state.error ? <div className="add-family-form-error">{this.state.error}</div> : false;

		return (
			<div className={familyClass} onClick={(e) => {this.toggleForm(e, true);} } id="font-create">
				<div className="add-family-form">
					<label className="add-family-form-label"><span className="add-family-form-label-order">1. </span>Choose a font template</label>
					<div className="add-family-form-template-list">
						{templateList}
					</div>
					<label className="add-family-form-label"><span className="add-family-form-label-order">2. </span>Choose a family name</label>
					<input ref="name" className="add-family-form-input" key={this.state.reset} type="text" placeholder="My new typeface"></input>
					{error}
					<div className="add-family-form-buttons">
						<Button click={(e) => {this.exit(e);} } label="Cancel" neutral={true}/>
						<Button click={(e) => {this.createFont(e);} } label="Create family"/>
					</div>
				</div>
			</div>
		);
	}
}

export class FamilyTemplateChoice extends React.Component {
	render() {
		const classes = Classnames({
			'family-template-choice': true,
			'is-active': this.props.selectedFont && this.props.selectedFont.name === this.props.font.name,
		});

		return (
			<div className={classes} onClick={() => {this.props.chooseFont(this.props.font);}}>
				<div className="family-template-choice-sample">
					<img src={`/assets/images/${this.props.font.sample}`} />
				</div>
				<div className="family-template-choice-name">
					{this.props.font.name}
				</div>
			</div>
		);
	}
}

export class AddVariant extends React.Component {
	componentWillMount() {
		this.client = LocalClient.instance();
		this.lifespan = new Lifespan();

		this.client.getStore('/fontLibrary', this.lifespan)
		.onUpdate(({head}) => {
				if (head.toJS().errorAddVariant !== this.state.error) {
					this.setState({
						error: head.toJS().errorAddVariant,
					});
				}
				if (head.toJS().errorAddVariant === undefined) {
					this.setState({
						flipped: false,
					});
				}
			})
			.onDelete(() => {
				this.setState(undefined);
			});

		this.setState({
			flipped: false,
		});
	}

	componentWillUnmount() {
		this.lifespan.release();
	}

	flip(e) {
		if (e.target.nodeName !== "INPUT") {
			this.setState({
				flipped: !this.state.flipped,
			});
		}

		this.setState({
			error: undefined,
		});
	}

	createVariant(e, name) {
		e.stopPropagation();
		this.client.dispatchAction('/create-variant', {
			name,
			familyName: this.props.familyName,
		});
		Log.ui('Collection.createVariant');
	}

	exit() {
		this.client.dispatchAction('/close-create-variant-modal', {});
	}

	render() {
		const classes = Classnames({
			variant: true,
			'flipping-variant': true,
			'is-flipped': this.state.flipped,
		});
		const rectoClasses = Classnames({
			'flipping-variant-recto': true,
			'is-flipped': this.state.flipped,
		});

		const versoClasses = Classnames({
			'flipping-variant-verso': true,
			'is-flipped': this.state.flipped,
		});

		return (
			<div className="variant" ref="container">
				<SelectWithLabel
					ref="country"
					name="country"
					placeholder="Enter a variant name or choose a suggestion with predefined settings"
					options={[{value:'yo', label:'yo'}]}/>
				<div className="variant-error">{this.state.error}</div>
				<div className="add-family-form-buttons">
					<Button click={(e) => {this.exit(e);} } label="Cancel" neutral={true}/>
					<Button click={(e) => {this.createFont(e);} } label="Create family"/>
				</div>
			</div>
		);
	}
}