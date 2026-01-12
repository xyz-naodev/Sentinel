import 'package:flutter/material.dart';
import 'dart:async';

class RealTimeClock extends StatefulWidget {
  final TextStyle? textStyle;
  final MainAxisAlignment alignment;

  const RealTimeClock({
    super.key,
    this.textStyle,
    this.alignment = MainAxisAlignment.center,
  });

  @override
  State<RealTimeClock> createState() => _RealTimeClockState();
}

class _RealTimeClockState extends State<RealTimeClock> {
  late Timer _timer;
  late DateTime _currentTime;

  @override
  void initState() {
    super.initState();
    _currentTime = DateTime.now();
    
    // Update time every second
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _currentTime = DateTime.now();
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatTime(DateTime time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    final second = time.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  String _formatDate(DateTime time) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    final day = days[time.weekday - 1];
    final month = months[time.month - 1];
    
    return '$day, $month ${time.day}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: widget.alignment,
      children: [
        Text(
          _formatTime(_currentTime),
          style: widget.textStyle ?? const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black,
            fontFamily: 'Roboto',
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _formatDate(_currentTime),
          style: widget.textStyle ?? const TextStyle(
            fontSize: 12,
            color: Colors.black54,
            fontFamily: 'Roboto',
          ),
        ),
      ],
    );
  }
}
