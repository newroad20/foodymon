import { Alert, Platform, type AlertButton } from 'react-native';

// react-native-web's Alert.alert does nothing, so on the web show the browser's own dialogs:
// one button -> alert(), a cancel button plus an action -> confirm() and run the action if OK.
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = message ? `${title}\n\n${message}` : title;
    const cancel = buttons?.find((b) => b.style === 'cancel');
    const actions = buttons?.filter((b) => b !== cancel) ?? [];
    if (cancel && actions.length > 0) {
      if (window.confirm(text)) actions[actions.length - 1].onPress?.();
      else cancel.onPress?.();
      return;
    }
    window.alert(text);
    actions[0]?.onPress?.();
  };
}
