import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class IncidentReport {
  static Future<String> getSupervisorId(String agentId) async {
    try {
      // Access Firestore instance
      FirebaseFirestore firestore = FirebaseFirestore.instance;

      // Fetch all documents from the users collection
      QuerySnapshot querySnapshot = await firestore.collection('users').get();

      // Iterate through each document to find the agent with the specified ID
      for (QueryDocumentSnapshot doc in querySnapshot.docs) {
        // Get the 'agents' field from the document data
        var data = doc.data() as Map<String, dynamic>;

        if (data != null) {
          if (data["agents"] != null) {
            List<dynamic> agents = data["agents"];

            // Check if any agent in the 'agents' array has the specified ID
            for (var agent in agents) {
              print("dafh");
              print(agent);
              if (agent['id'] == agentId) {
                return data["id"];
                // Return the ID of the user (supervisor) containing the agent
              }
            }
          }
        }
      }

      // If no user contains the agent with the specified ID
      print("No user found with the agent ID: $agentId");
      return "";
    } catch (error) {
      // Handle errors
      print("Error fetching supervisor ID: $error");
      return "";
    }
  }

  static Future<void> reportIncident(BuildContext context) async {
    final TextEditingController _incidentController = TextEditingController();
    final FirebaseAuth _auth = FirebaseAuth.instance;
    final User? user = _auth.currentUser;

    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No user is signed in')),
      );
      return;
    }

    await showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Report Incident'),
          content: TextField(
            controller: _incidentController,
            decoration: InputDecoration(hintText: 'Describe the incident'),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () async {
                final incidentMessage = _incidentController.text.trim();
                if (incidentMessage.isNotEmpty) {
                  final FirebaseFirestore _firestore =
                      FirebaseFirestore.instance;

                  await _firestore.collection('incidents').add({
                    'agentId': user.uid,
                    'supervisorId': await getSupervisorId(user.uid),
                    'incident': incidentMessage,
                    'timestamp': DateTime.now(),
                  });

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Incident reported successfully')),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Incident message cannot be empty')),
                  );
                }
                Navigator.of(context).pop();
              },
              child: const Text('Submit'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }
}
