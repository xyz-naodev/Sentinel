import 'package:flutter/material.dart';

/// On-screen keyboard widget for kiosk mode
/// Shows a virtual keyboard when text fields are focused
class OnScreenKeyboard extends StatefulWidget {
  final TextEditingController controller;
  final VoidCallback onClose;
  final bool isPasswordField;
  final KeyboardType keyboardType;
  final VoidCallback? onKeyPressed;

  const OnScreenKeyboard({
    super.key,
    required this.controller,
    required this.onClose,
    this.isPasswordField = false,
    this.keyboardType = KeyboardType.alphanumeric,
    this.onKeyPressed,
  });

  @override
  State<OnScreenKeyboard> createState() => _OnScreenKeyboardState();
}

enum KeyboardType { alphanumeric, numeric, email }

class _OnScreenKeyboardState extends State<OnScreenKeyboard> {
  bool _isShiftActive = false;
  bool _isCapsActive = false;
  bool _showPassword = false;

  // QWERTY keyboard layout
  final List<List<String>> _qwertyRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  // Numeric keyboard layout
  final List<List<String>> _numericRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0', '.', '-'],
  ];

  // Email keyboard layout (alphanumeric + special chars)
  final List<List<String>> _emailRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.'],
  ];

  List<List<String>> get _currentLayout {
    switch (widget.keyboardType) {
      case KeyboardType.numeric:
        return _numericRows;
      case KeyboardType.email:
        return _emailRows;
      case KeyboardType.alphanumeric:
        return _qwertyRows;
    }
  }

  void _addCharacter(String char) {
    // Apply case transformation if not numeric
    String charToAdd = char;
    if (!char.contains(RegExp(r'[0-9.]')) && 
        !char.contains(RegExp(r'[@\-]'))) {
      if (_isCapsActive || _isShiftActive) {
        charToAdd = char.toUpperCase();
      } else {
        charToAdd = char.toLowerCase();
      }
    }

    // Append character and set cursor at end
    final text = widget.controller.text + charToAdd;
    widget.controller.value = widget.controller.value.copyWith(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    widget.onKeyPressed?.call();
  }

  void _backspace() {
    if (widget.controller.text.isNotEmpty) {
      final text = widget.controller.text.substring(0, widget.controller.text.length - 1);
      widget.controller.value = widget.controller.value.copyWith(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
      );
    }
    widget.onKeyPressed?.call();
  }

  void _space() {
    final text = widget.controller.text + ' ';
    widget.controller.value = widget.controller.value.copyWith(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    widget.onKeyPressed?.call();
  }

  Widget _buildKey(
    String label, {
    VoidCallback? onPressed,
    Color? backgroundColor,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          decoration: BoxDecoration(
            color: backgroundColor ?? const Color(0xFF2D2D2D),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: const Color(0xFF444444),
              width: 1,
            ),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Center(
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF1A1A1A),
      padding: const EdgeInsets.all(8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // DISPLAY + BUTTONS ROW
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2D2D2D),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFF444444),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      widget.isPasswordField
                          ? (_showPassword
                              ? widget.controller.text
                              : '•' * widget.controller.text.length)
                          : widget.controller.text.isEmpty
                              ? 'Click to type...'
                              : widget.controller.text,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // EYE ICON (only for password fields)
                if (widget.isPasswordField)
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        setState(() => _showPassword = !_showPassword);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF444444),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          _showPassword ? Icons.visibility : Icons.visibility_off,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: widget.onClose,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFB00020),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.close,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // KEYBOARD ROWS
          ..._currentLayout.map((row) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: row.map((key) {
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: _buildKey(
                        _isShiftActive || _isCapsActive
                            ? key.toUpperCase()
                            : key.toLowerCase(),
                        onPressed: () => _addCharacter(key),
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          }).toList(),
          // SPECIAL KEYS ROW
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                // CAPS LOCK (only for alphanumeric)
                if (widget.keyboardType == KeyboardType.alphanumeric)
                  Expanded(
                    flex: 2,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: _buildKey(
                        'CAPS',
                        backgroundColor: _isCapsActive
                            ? const Color(0xFF6A0D51)
                            : const Color(0xFF2D2D2D),
                        onPressed: () {
                          setState(() => _isCapsActive = !_isCapsActive);
                          widget.onKeyPressed?.call();
                        },
                      ),
                    ),
                  ),
                // SHIFT (only for alphanumeric)
                if (widget.keyboardType == KeyboardType.alphanumeric)
                  Expanded(
                    flex: 2,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: _buildKey(
                        'SHIFT',
                        backgroundColor: _isShiftActive
                            ? const Color(0xFF6A0D51)
                            : const Color(0xFF2D2D2D),
                        onPressed: () {
                          setState(() => _isShiftActive = !_isShiftActive);
                          widget.onKeyPressed?.call();
                        },
                      ),
                    ),
                  ),
                // BACKSPACE
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: _buildKey(
                      '← DEL',
                      backgroundColor: const Color(0xFFD32F2F),
                      onPressed: _backspace,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // SPACE BAR
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                Expanded(
                  flex: 8,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: _buildKey(
                      'SPACE',
                      onPressed: _space,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: _buildKey(
                      'DONE',
                      backgroundColor: const Color(0xFF388E3C),
                      onPressed: widget.onClose,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom TextField wrapper that shows on-screen keyboard using an OverlayEntry
class KioskTextField extends StatefulWidget {
  final TextEditingController controller;
  final String hintText;
  final Icon? icon;
  final bool obscureText;
  final KeyboardType keyboardType;
  final int maxLines;
  final TextInputType? nativeKeyboardType;

  const KioskTextField({
    super.key,
    required this.controller,
    required this.hintText,
    this.icon,
    this.obscureText = false,
    this.keyboardType = KeyboardType.alphanumeric,
    this.maxLines = 1,
    this.nativeKeyboardType,
  });

  @override
  State<KioskTextField> createState() => _KioskTextFieldState();
}

class _KioskTextFieldState extends State<KioskTextField> {
  late FocusNode _focusNode;
  OverlayEntry? _overlayEntry;
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _removeKeyboardOverlay();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      _showKeyboardOverlay();
    }
  }

  void _showKeyboardOverlay() {
    if (_overlayEntry != null) return;
    _overlayEntry = _createOverlayEntry();
    final overlay = Overlay.of(context, debugRequiredFor: widget);
    overlay?.insert(_overlayEntry!);
  }

  void _removeKeyboardOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    if (_focusNode.hasFocus) _focusNode.unfocus();
  }

  void _refocusTextField() {
    if (!_focusNode.hasFocus) {
      _focusNode.requestFocus();
    }
  }

  OverlayEntry _createOverlayEntry() {
    return OverlayEntry(
      builder: (context) => Positioned(
        left: 0,
        right: 0,
        bottom: 0,
        child: Material(
          color: Colors.transparent,
          child: OnScreenKeyboard(
            controller: widget.controller,
            onClose: _removeKeyboardOverlay,
            isPasswordField: widget.obscureText,
            keyboardType: widget.keyboardType,
            onKeyPressed: _refocusTextField,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final horizontalMargin = screenWidth > 600 ? 40.0 : 10.0;
    
    return Container(
      margin: EdgeInsets.symmetric(horizontal: horizontalMargin),
      padding: const EdgeInsets.symmetric(horizontal: 15),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: _focusNode.hasFocus ? const Color(0xFF6A0D51) : Colors.purple,
          width: _focusNode.hasFocus ? 3 : 2,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: widget.controller,
              focusNode: _focusNode,
              obscureText: widget.obscureText && !_showPassword,
              readOnly: false,
              maxLines: widget.maxLines,
              decoration: InputDecoration(
                border: InputBorder.none,
                icon: widget.icon,
                hintText: widget.hintText,
              ),
            ),
          ),
          if (widget.obscureText)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: InkWell(
                onTap: () {
                  setState(() => _showPassword = !_showPassword);
                },
                borderRadius: BorderRadius.circular(8),
                child: Icon(
                  _showPassword ? Icons.visibility : Icons.visibility_off,
                  color: Colors.purple,
                  size: 20,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
