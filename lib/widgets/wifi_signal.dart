import 'package:flutter/material.dart';

class WiFiSignal extends StatefulWidget {
  final TextStyle? textStyle;

  const WiFiSignal({
    super.key,
    this.textStyle,
  });

  @override
  State<WiFiSignal> createState() => _WiFiSignalState();
}

class _WiFiSignalState extends State<WiFiSignal> {
  int _signalStrength = 4; // 0-4 for testing (100% signal)

  @override
  void initState() {
    super.initState();
    // TODO: Implement actual WiFi signal strength detection
    // For now, we're using test values
  }

  /// Builds a minimalist black WiFi signal indicator matching iOS style
  Widget _buildMinimalistWiFi() {
    const color = Colors.black;
    
    return SizedBox(
      width: 16,
      height: 14,
      child: CustomPaint(
        painter: _ModernWiFiPainter(
          color: color,
          signalStrength: _signalStrength,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _buildMinimalistWiFi();
  }
}

class _WiFiArcPainter extends CustomPainter {
  final Color color;
  final double radius;
  final double strokeWidth;

  _WiFiArcPainter({
    required this.color,
    required this.radius,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height);
    
    // Draw arc (quarter circle from 180 to 0 degrees)
    canvas.drawArc(
      Rect.fromCenter(
        center: center,
        width: radius * 2,
        height: radius * 2,
      ),
      3.14159, // 180 degrees in radians (π)
      3.14159, // 180 degrees arc (π)
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(_WiFiArcPainter oldDelegate) => false;
}

class _ModernWiFiPainter extends CustomPainter {
  final Color color;
  final int signalStrength;

  _ModernWiFiPainter({
    required this.color,
    required this.signalStrength,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final center = Offset(size.width / 2, size.height);
    
    // Arc 1 (innermost) - always show if connected
    if (signalStrength >= 1) {
      canvas.drawArc(
        Rect.fromCenter(
          center: center,
          width: 4,
          height: 4,
        ),
        3.14159,
        3.14159,
        false,
        paint,
      );
    }
    
    // Arc 2 (middle) - show if signal >= 2
    if (signalStrength >= 2) {
      canvas.drawArc(
        Rect.fromCenter(
          center: center,
          width: 8,
          height: 8,
        ),
        3.14159,
        3.14159,
        false,
        paint,
      );
    }
    
    // Arc 3 (outermost) - show if signal >= 3
    if (signalStrength >= 3) {
      canvas.drawArc(
        Rect.fromCenter(
          center: center,
          width: 12,
          height: 12,
        ),
        3.14159,
        3.14159,
        false,
        paint,
      );
    }
    
    // Dot at bottom
    canvas.drawCircle(center, 1, paint..style = PaintingStyle.fill);
  }

  @override
  bool shouldRepaint(_ModernWiFiPainter oldDelegate) =>
      oldDelegate.signalStrength != signalStrength;
}
