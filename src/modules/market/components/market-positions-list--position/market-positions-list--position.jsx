/* eslint-disable jsx-a11y/no-static-element-interactions */ // needed because <button> cannot take the place <ul> in the table structure
/* eslint-disable react/no-array-index-key */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import getValue from 'utils/get-value'

import Styles from 'modules/market/components/market-positions-list--position/market-positions-list--position.styles'

export default class Position extends Component {
  static propTypes = {
    outcomeName: PropTypes.string.isRequired,
    position: PropTypes.object.isRequired,
    openOrders: PropTypes.array.isRequired,
    isExtendedDisplay: PropTypes.bool.isRequired,
    isMobile: PropTypes.bool.isRequired,
  }

  static calcAvgDiff(position, order) {
    const positionAvg = getValue(position, 'avgPrice.formattedValue') || 0
    const positionShares = getValue(position, 'qtyShares.formattedValue') || 0

    const orderPrice = (getValue(order, 'order.purchasePrice.formattedValue') || 0)
    const orderShares = (getValue(order, 'order.qtyShares.formattedValue') || 0)

    const newAvg = ((positionAvg * positionShares) + (orderPrice * orderShares)) / (positionShares + orderShares)
    const avgDiff = (newAvg - positionAvg).toFixed(4)

    return avgDiff < 0 ? avgDiff : `+${avgDiff}`
  }

  constructor(props) {
    super(props)

    this.state = {
      showConfirm: false,
      confirmHeight: 'auto',
      confirmMargin: '0px',
    }

    this.toggleConfirm = this.toggleConfirm.bind(this)
  }

  toggleConfirm() {
    let {
      confirmHeight,
      confirmMargin,
    } = this.state

    if (!this.state.showConfirm) {
      confirmHeight = `${this.position.clientHeight}px`
    }

    if (this.position.offsetTop !== this.confirmMessage.offsetTop) {
      confirmMargin = `${this.position.offsetTop - this.confirmMessage.offsetTop}px`
    }

    this.setState({
      confirmHeight,
      confirmMargin,
      showConfirm: !this.state.showConfirm,
    })
  }

  render() {
    const {
      isExtendedDisplay,
      isMobile,
      outcomeName,
      openOrders,
      position,
    } = this.props
    const s = this.state

    const confirmStyle = {
      height: s.confirmHeight,
      marginTop: s.confirmMargin,
    }

    return (
      <ul
        ref={(position) => { this.position = position }}
        className={!isMobile ?
          classNames(Styles.Position, { [Styles['Position-not_extended']]: isExtendedDisplay })
          : Styles.PortMobile
        }
      >
        <li>
          { outcomeName }
        </li>
        <li>
          { getValue(position, 'qtyShares.formatted') }
        </li>
        <li>
          { getValue(position, 'purchasePrice.formatted') }
        </li>
        { isExtendedDisplay && !isMobile &&
          <li>
            {getValue(position, 'lastPrice.formatted') }
          </li>
        }
        { !isMobile && <li>{ getValue(position, 'realizedNet.formatted')} </li> }
        { !isMobile && <li>{ getValue(position, 'unrealizedNet.formatted') }</li>}
        { isExtendedDisplay &&
          <li>
            {getValue(position, 'totalNet.formatted') }
          </li>
        }
        <li>
          <button onClick={this.toggleConfirm}>Close</button>
        </li>
        <div
          ref={(confirmMessage) => { this.confirmMessage = confirmMessage }}
          className={classNames(Styles.Position__confirm, { [`${Styles['is-open']}`]: s.showConfirm })}
          style={confirmStyle}
        >
          { openOrders.length > 0 ?
            <div className={Styles['Position__confirm-details']}>
              <p>Positions cannot be closed while orders are pending.</p>
              <div className={Styles['Position__confirm-options']}>
                <button onClick={this.toggleConfirm}>Ok</button>
              </div>
            </div>
            :
            <div className={Styles['Position__confirm-details']}>
              <p>Close position by selling { getValue(position, 'qtyShares.formatted') } shares of “{ outcomeName }” at market price?</p>
              <div className={Styles['Position__confirm-options']}>
                <button
                  onClick={(e) => {
                    position.closePosition(position.marketId, position.outcomeId)
                    this.toggleConfirm()
                  }}
                >
                  Yes
                </button>
                <button onClick={this.toggleConfirm}>No</button>
              </div>
            </div>
          }
        </div>
      </ul>
    )
  }
}
