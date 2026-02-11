/**
 * @fileoverview Reusable Card component for Fiscus app.
 * 
 * Provides a consistent card container with dark theme styling,
 * shadows, and rounded corners.
 * 
 * @module components/Card
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { theme, getShadow } from '../theme';

/**
 * Card component for wrapping content in a styled container.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Card content.
 * @param {Object} [props.style] - Additional styles.
 * @param {'none'|'small'|'medium'|'large'} [props.elevation='medium'] - Shadow level.
 * @returns {JSX.Element} Card component.
 * 
 * @example
 * <Card>
 *   <Text>Card content</Text>
 * </Card>
 * 
 * @example
 * <Card elevation="large" style={{ marginTop: 20 }}>
 *   <Text>Elevated card</Text>
 * </Card>
 */
export const Card = ({ children, style, elevation = 'medium' }) => {
  const shadowStyle = getShadow(elevation);

  return (
    <View style={[styles.card, shadowStyle, style]}>
      {children}
    </View>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  elevation: PropTypes.oneOf(['none', 'small', 'medium', 'large']),
};

Card.defaultProps = {
  elevation: 'medium',
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface, // Dark Purple Surface
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    marginVertical: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.border, // Medium Purple Border
  },
});

export default Card;
