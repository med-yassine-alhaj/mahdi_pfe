import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:tracking/CollectionPoints.dart';

class LoginPage extends StatefulWidget {
  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  late String _email, _password;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Image de fond
          Container(
            decoration: const BoxDecoration(
              image: DecorationImage(
                image: AssetImage('assets/trash_truck_background.jpg'),
                // Chemin relatif correct
                fit: BoxFit.cover,
              ),
            ),
          ),
          // Formulaire de connexion
          Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    // Champ de saisie de l'email
                    TextFormField(
                      validator: (input) {
                        if (input == null || input.isEmpty) {
                          return 'Please type an email';
                        }
                        return null;
                      },
                      onSaved: (input) => _email = input!,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.8),
                        labelText: 'Email',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    SizedBox(height: 16.0),
                    // Champ de saisie du mot de passe
                    TextFormField(
                      validator: (input) {
                        if (input == null || input.length < 6) {
                          return 'Your password needs to be at least 6 characters';
                        }
                        return null;
                      },
                      onSaved: (input) => _password = input!,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.8),
                        labelText: 'Password',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      obscureText: true,
                    ),
                    const SizedBox(height: 20.0),
                    // Bouton de connexion
                    ElevatedButton(
                      onPressed: signIn,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green, // Couleur du bouton
                        padding:
                            const EdgeInsets.symmetric(horizontal: 50, vertical: 15),
                        textStyle: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      child: const Text(
                        'Sign in',
                        style:
                            TextStyle(color: Colors.white), // Couleur du texte
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void signIn() async {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      try {
        var response = await _auth.signInWithEmailAndPassword(
            email: _email, password: _password);

        print(response.user?.email);
        // Navigate to success page
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => MapSample()),
        );
      } catch (e) {
        print(e.toString());
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
            Text('Email or password are incorrect'),
          ),
        );
      }
    }
  }
}
