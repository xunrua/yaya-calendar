import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../stores/themeStore';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  animationType?: 'slide' | 'fade';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  animationType = 'slide',
}) => {
  const { theme } = useTheme();
  const [slideAnim] = React.useState(new Animated.Value(SCREEN_HEIGHT));
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      if (animationType === 'slide') {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (animationType === 'slide') {
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, animationType, slideAnim, fadeAnim]);

  const animatedStyle =
    animationType === 'slide'
      ? { transform: [{ translateY: slideAnim }] }
      : { opacity: fadeAnim };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: theme.colors.surface,
                },
                animatedStyle,
              ]}
            >
              {/* Header */}
              {title && (
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {title}
                  </Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Content */}
              <View style={styles.content}>{children}</View>

              {/* Footer */}
              {footer && (
                <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                  {footer}
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
  },
  content: {
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
});

export default Modal;