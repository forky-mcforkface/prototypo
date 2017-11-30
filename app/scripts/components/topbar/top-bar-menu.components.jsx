import PropTypes from 'prop-types';
import React from 'react';
import onClickOutside from 'react-onclickoutside';
import classNames from 'classnames';

class TopBarMenu extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			itemDisplayed: null,
		};

		this.handleClickOutside = this.handleClickOutside.bind(this);
		this.onSelectItem = this.onSelectItem.bind(this);
	}

	onSelectItem(itemIndex) {
		this.setState(state => ({itemDisplayed: state.itemDisplayed === itemIndex ? null : itemIndex}));

		// TODO: notify composed item
	}

	handleClickOutside() {
		this.setState({itemDisplayed: null});
	}

	render() {
		const {itemDisplayed} = this.state;
		const {children, ...rest} = this.props;

		return (
			<ul {...rest} className="top-bar-menu">
				{React.Children.map(children, (child, index) => {
					if (!child || !child.props) {
						return child;
					}

					const {
						alignRight,
						action,
						img,
						centered,
						imgDarkBackground,
						headerClassName,
						id,
						noHover,
						enter,
					} = child.props;

					const classes = classNames(
						{
							'top-bar-menu-item': true,
							'is-aligned-right': alignRight,
							'is-action': action,
							'is-icon-menu': img,
							'is-centered': centered,
							'img-dark-background': imgDarkBackground,
						},
						headerClassName,
					);
					const count = index > 0 && index < 6 ? index : 0;

					return (
						<TopBarMenuItem
							className={classes}
							key={index} // eslint-disable-line
							id={id}
							count={count}
							noHover={noHover}
							onMouseEnter={enter}
							selected={itemDisplayed === index}
							onMouseLeave={child && child.props.leave}
							onSelectItem={this.onSelectItem}
						>
							{child && child.type.getHeader && child.type.getHeader(child.props)}
							{child}
						</TopBarMenuItem>
					);
				})}
			</ul>
		);
	}
}

TopBarMenu.defaultProps = {
	className: '',
	topbarItemDisplayed: -1,
	noHover: false,
	count: 0,
};

TopBarMenu.propTypes = {
	className: PropTypes.string,
	topbarItemDisplayed: PropTypes.number,
	noHover: PropTypes.bool,
	count: PropTypes.number,
};

export const TopBarMenuRaw = TopBarMenu;
export default onClickOutside(TopBarMenu);

class TopBarMenuItem extends React.PureComponent {
	constructor(props) {
		super(props);

		this.handleClick = this.handleClick.bind(this);
	}

	handleClick() {
		this.props.onSelectItem(this.props.count);
	}

	render() {
		const {className, noHover, selected, count, children} = this.props;

		const classes = classNames(className, {
			'topbaritem-displayed': selected,
			'no-hover': noHover,
		});
		const id = count ? `topbar-menu-item-${this.props.count}` : '';

		return (
			<li className={classes} id={id} onClick={this.handleClick}>
				{children}
			</li>
		);
	}
}

TopBarMenuItem.defaultProps = {
	className: '',
	noHover: false,
	count: 0,
	selected: false,
};

TopBarMenuItem.propTypes = {
	className: PropTypes.string,
	noHover: PropTypes.bool,
	count: PropTypes.number,
	selected: PropTypes.bool,
};
