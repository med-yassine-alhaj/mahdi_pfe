import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

class CollectionPointImageUploader {
  final String agentId;
  final String collectionPointId;
  final String collectionPointName;
  final double lat;
  final double lng;
  final String tourneeId;

  // Remplace par ta clé API imgbb
  static const String _imgbbApiKey = '4f975cdffaa6a3189fcc490746f4e2d2';

  CollectionPointImageUploader({
    required this.agentId,
    required this.collectionPointId,
    required this.collectionPointName,
    required this.lat,
    required this.lng,
    required this.tourneeId,
  });

  Future<void> uploadImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
    );

    if (pickedFile == null) return;

    try {
      final File imageFile = File(pickedFile.path);
      final List<int> imageBytes = await imageFile.readAsBytes();
      final String base64Image = base64Encode(imageBytes);

      final response = await http.post(
        Uri.parse('https://api.imgbb.com/1/upload?key=$_imgbbApiKey'),
        body: {'image': base64Image},
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final String imageUrl = jsonResponse['data']['url'];
        await saveImageMetadata(imageUrl);
      } else {
        print('Erreur imgbb: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      print('Erreur upload image: $e');
    }
  }

  Future<void> saveImageMetadata(String imageUrl) async {
    try {
      await FirebaseFirestore.instance.collection('images').add({
        'tourneeId': tourneeId,
        'agentId': agentId,
        'collectionPointId': collectionPointId,
        'collectionPointName': collectionPointName,
        'lat': lat,
        'lng': lng,
        'date': DateTime.now().toString(),
        'imageUrl': imageUrl,
      });
    } catch (e) {
      print('Erreur sauvegarde metadata: $e');
    }
  }
}
