/**
 * @fileoverview PriceTag component for displaying prices.
 * 
 * Provides consistent price display with currency symbol
 * and optional styling for best/worst prices.
 * 
 * @module components/PriceTag
 */

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { theme } from '../theme';

/**
 * PriceTag component for displaying formatted prices.
 * 
 * @param {Object} props - Component props.
 * @param {number|string} props.amount - Price amount.
 * @param {string} [props.currency='₴'] - Currency symbol.
 * @param {'default'|'success'|'danger'|'muted'} [props.variant='default'] - Visual variant.
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Size preset.
 * @returns {JSX.Element} PriceTag component.
 * 
 * @example
 * <PriceTag amount={45.50} />
 * 
 * @example
 * <PriceTag amount={45.50} variant="success" size="large" />
 */
export const PriceTag = ({
  amount,
  currency = '₴',
  variant = 'default',
  size = 'medium'
}) => {
  // Format amount
  const formattedAmount = typeof amount === 'number'
    ? amount.toFixed(2)
    : amount;

  // Get variant color
  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'muted':
        return theme.colors.textSecondary;
      default:
        return theme.colors.primary;
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 14, amountSize: 16 };
      case 'large':
        return { fontSize: 18, amountSize: 28 };
      default:
        return { fontSize: 16, amountSize: 22 };
    }
  };

  const color = getVariantColor();
  const sizeStyles = getSizeStyles();

  return (
    <View style={styles.container}>
      <Text style={[styles.currency, { color, fontSize: sizeStyles.fontSize }]}>
        {currency}
      </Text>
      <Text style={[styles.amount, { color, fontSize: sizeStyles.amountSize }]}>
        {formattedAmount}
      </Text>
    </View>
  );
};

PriceTag.propTypes = {
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  currency: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'success', 'danger', 'muted']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

PriceTag.defaultProps = {
  currency: '₴',
  variant: 'default',
  size: 'medium',
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontWeight: '600',
    marginRight: 2,
  },
  amount: {
    fontWeight: 'bold',
  },
});

export default PriceTag;
