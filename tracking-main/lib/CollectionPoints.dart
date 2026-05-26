import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:location/location.dart' as loc;
import 'package:http/http.dart' as http;
import 'package:tracking/CollectionPointImageUploader.dart';
import 'package:tracking/IncidentReport.dart';

class MapSample extends StatefulWidget {
  const MapSample({super.key});

  @override
  State<MapSample> createState() => MapSampleState();
}

class MapSampleState extends State<MapSample> {
  DateTime startDate = DateTime.now();
  final Set<Marker> _markers = {};
  final List<LatLng> _polylinePoints = [];
  final List<LatLng> _collectionPoints = [];
  final loc.Location _locationTracker = loc.Location();
  Timer? _locationUpdateTimer;
  bool _isTracking = false;
  final Completer<GoogleMapController> _controller =
      Completer<GoogleMapController>();
  String agentId = "";

  var id;
  var currentTourneeId;

  // Initial Camera Position
  static CameraPosition _kGooglePlex = const CameraPosition(
    target: LatLng(35.81271783644581, 10.0772944703472),
    zoom: 10,
  );

  final DatabaseReference _databaseReference = FirebaseDatabase(
    databaseURL:
        'https://mahdi-pfe-default-rtdb.europe-west1.firebasedatabase.app/',
  ).reference();

  // Get Collection Points On Page Load
  Future<void> getAgentsCollection() async {
    final FirebaseAuth auth = FirebaseAuth.instance;
    final User? user = auth.currentUser;

    if (user != null) {
      agentId = user.uid;
      final FirebaseFirestore firestore = FirebaseFirestore.instance;
      final CollectionReference agentsRef = firestore.collection('tournees');

      try {
        final QuerySnapshot querySnapshot =
            await agentsRef.where('agentId', isEqualTo: agentId).get();

        if (querySnapshot.docs.isNotEmpty) {
          print('Agents collection matching with current logged in agent:');
          querySnapshot.docs.forEach((document) {
            final data = document.data() as Map<String, dynamic>;
            if (data != null) {
              final pointsDeCollect = data['pointsDeCollect'] as List<dynamic>;

              pointsDeCollect.forEach((point) {
                final lat = point['lat'] as double;
                final lng = point['lng'] as double;
                final markerIdVal =
                    Random().nextInt(10000).toString(); // generate random id
                _markers.add(
                  Marker(
                    markerId: MarkerId(markerIdVal),
                    position: LatLng(lat, lng),
                    icon: BitmapDescriptor.defaultMarker,
                  ),
                );

                _collectionPoints.add(LatLng(lat, lng));
              });

              final firstPoint = pointsDeCollect[0];
              if (firstPoint != null) {
                _kGooglePlex = CameraPosition(
                  target: LatLng(
                      firstPoint['lat'] as double, firstPoint['lng'] as double),
                  zoom: 19,
                );
              }
            }
          });
        } else {
          print('No agents collection matching with current logged in agent');
        }

        final GoogleMapController controller = await _controller.future;

        final loc.LocationData? location = await _locationTracker.getLocation();
        if (location != null) {
          LatLng currentPosition =
              LatLng(location.latitude!, location.longitude!);

          _kGooglePlex = CameraPosition(
            target: LatLng(currentPosition.latitude, currentPosition.longitude),
            zoom: 19,
          );
        }

        final String supervisorId =
            await IncidentReport.getSupervisorId(agentId);
        print(agentId);
        print("supervisor");
        print(supervisorId);

        final CollectionReference usersRef = firestore.collection('users');

        final QuerySnapshot centreDeDepotsSnapshot =
            await usersRef.where('id', isEqualTo: supervisorId).get();

        if (centreDeDepotsSnapshot.docs.isNotEmpty) {
          centreDeDepotsSnapshot.docs.forEach((document) {
            final data = document.data() as Map<String, dynamic>;
            print("sablito");
            print(data);

            if (data != null) {
              final pointsDeCollect = data['centresDeDepots'] as List<dynamic>;

              pointsDeCollect.forEach((point) {
                final lat = point['lat'] as double;
                final lng = point['lng'] as double;
                final markerIdVal =
                    Random().nextInt(10000).toString(); // generate random id

                _markers.add(
                  Marker(
                    markerId: MarkerId(markerIdVal),
                    position: LatLng(lat, lng),
                    icon: BitmapDescriptor.defaultMarkerWithHue(
                        BitmapDescriptor.hueViolet),
                  ),
                );

                _collectionPoints.add(LatLng(lat, lng));
              });
            }
          });
        }

        setState(() {}); // Call setState to update the markers
      } catch (e) {
        print('Error fetching agent collection: $e');
      }
    } else {
      print('No user is signed in');
    }
  }

  // Save Each New Position To Realtime Database
  Future<void> updateAgentPosition(
      String agentId, double lat, double lng) async {
    await _databaseReference.child('tracking').push().set({
      'agentId': agentId,
      'lat': lat,
      'lng': lng,
    });
  }

  Future<List<LatLng>> getRoadRoute(LatLng start, LatLng end) async {
    const String apiKey = 'AIzaSyA73CubqAyM5AtIGNibDxA2mMqnxczT7LM';
    final String url =
        'https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&mode=driving&key=$apiKey';

    final response = await http.get(Uri.parse(url));

    if (response.statusCode == 200) {
      final decodedData = json.decode(response.body);
      final routes = decodedData['routes'] as List;
      if (routes.isNotEmpty) {
        final points = routes[0]['overview_polyline']['points'];
        return _decodePolyline(points);
      }
    } else {
      throw Exception('Failed to load road route');
    }
    return [];
  }

// Helper method to decode polyline points
  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> poly = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      final LatLng point = LatLng(lat / 1E5, lng / 1E5);
      poly.add(point);
    }
    return poly;
  }

  void _onMarkerTapped(MarkerId markerId) {
    if (_isTracking) {
      showModalBottomSheet(
        context: context,
        builder: (BuildContext context) {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const Text('Take a picture'),
                const SizedBox(height: 10),
                const Text(
                    'Would you like to take a picture of this collection point?'),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () {
                    CollectionPointImageUploader(
                      tourneeId: id,
                      agentId: agentId,
                      collectionPointId: markerId.value.toString(),
                      collectionPointName: 'Collection Point Name',
                      lat: _markers
                          .firstWhere((marker) => marker.markerId == markerId)
                          .position
                          .latitude,
                      lng: _markers
                          .firstWhere((marker) => marker.markerId == markerId)
                          .position
                          .longitude,
                    ).uploadImage();
                    Navigator.of(context).pop();
                  },
                  child: const Text('Take Picture'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: Text('Cancel'),
                ),
              ],
            ),
          );
        },
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Tournees is not started. Please start tracking first.'),
        ),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    getAgentsCollection();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collection Points'),
        actions: _isTracking
            ? [
                IconButton(
                  icon: const Icon(Icons.stop),
                  onPressed: _stopLocationUpdates,
                ),
              ]
            : [
                IconButton(
                  icon: Icon(Icons.play_arrow),
                  onPressed: _getUserLocation,
                ),
              ],
      ),
      body: GoogleMap(
        mapType: MapType.normal,
        initialCameraPosition: _kGooglePlex,
        markers: _markers.map((marker) {
          return Marker(
            markerId: marker.markerId,
            position: marker.position,
            icon: marker.icon,
            onTap: () {
              _onMarkerTapped(marker.markerId);
            },
          );
        }).toSet(),
        polylines: {
          Polyline(
            polylineId: PolylineId('roadRoute'),
            points: _polylinePoints,
            color: Colors.blue,
            width: 3,
          ),
        },
        zoomControlsEnabled: false,
        onMapCreated: (GoogleMapController controller) {
          _controller.complete(controller);
        },
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: _goToTheFirstLocation,
            child: Icon(Icons.directions),
          ),
          SizedBox(height: 16),
          FloatingActionButton(
            onPressed: _zoomIn,
            child: Icon(Icons.add),
          ),
          SizedBox(height: 16),
          FloatingActionButton(
            onPressed: _zoomOut,
            child: Icon(Icons.remove),
          ),
          SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () => IncidentReport.reportIncident(context),
            child: Icon(Icons.report),
          ),
        ],
      ),
    );
  }

  Future<void> _getUserLocation() async {
    final GoogleMapController controller = await _controller.future;
    final loc.LocationData? location = await _locationTracker.getLocation();
    if (location != null) {
      LatLng currentPosition = LatLng(location.latitude!, location.longitude!);

      // Check if _collectionPoints is not empty
      if (_collectionPoints.isNotEmpty) {
        // Find the nearest point
        LatLng nearestPoint = _collectionPoints.first;
        double minDistance = _calculateDistance(currentPosition, nearestPoint);

        for (LatLng point in _collectionPoints) {
          double distance = _calculateDistance(currentPosition, point);
          if (distance < minDistance) {
            nearestPoint = point;
            minDistance = distance;
          }
        }

        // Get the road route points
        List<LatLng> roadRoutePoints =
            await getRoadRoute(currentPosition, nearestPoint);

        setState(() {
          // Draw the road route on the map
          _polylinePoints.clear();
          _polylinePoints.addAll(roadRoutePoints);

          _markers.add(
            Marker(
              markerId: const MarkerId('currentLocation'),
              position: currentPosition,
              icon: BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueBlue),
            ),
          );
        });
        await controller.animateCamera(
          CameraUpdate.newLatLng(currentPosition),
        );

        startDate = DateTime.now();

        id = DateTime.now().microsecondsSinceEpoch.toString();

        if (!_isTracking) {
          // Start a timer to update the location every 10 seconds
          _locationUpdateTimer =
              Timer.periodic(const Duration(seconds: 10), (timer) async {
            final loc.LocationData? newLocation =
                await _locationTracker.getLocation();
            if (newLocation != null) {
              LatLng newLatLng =
                  LatLng(newLocation.latitude!, newLocation.longitude!);
              List<LatLng> newRoutePoints =
                  await getRoadRoute(currentPosition, newLatLng);
              //_polylinePoints.addAll(newRoutePoints);
              setState(() {
                _markers.add(
                  Marker(
                    markerId: MarkerId('currentLocation'),
                    position: newLatLng,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
                  ),
                );
              });

              final FirebaseAuth auth = FirebaseAuth.instance;
              final User? user = auth.currentUser;
              if (user != null) {
                updateAgentPosition(
                    user.uid, newLocation.latitude!, newLocation.longitude!);
                print("data saved to Firestore");
              }
            }
          });
        }
      } else {
        print('No collection points available to find the nearest point');
      }
    }

    setState(() {
      _isTracking = true;
    });
  }

// Helper method to calculate the distance between two LatLng points
  double _calculateDistance(LatLng point1, LatLng point2) {
    double lat1 = point1.latitude;
    double lon1 = point1.longitude;
    double lat2 = point2.latitude;
    double lon2 = point2.longitude;

    var p = 0.017453292519943295;
    var a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;

    return 12742 * asin(sqrt(a));
  }

  Future<void> _goToTheFirstLocation() async {
    final GoogleMapController controller = await _controller.future;
    await controller.animateCamera(CameraUpdate.newLatLng(_kGooglePlex.target));
  }

  void _zoomIn() async {
    final GoogleMapController controller = await _controller.future;
    controller.animateCamera(CameraUpdate.zoomIn());
  }

  void _zoomOut() async {
    final GoogleMapController controller = await _controller.future;
    controller.animateCamera(CameraUpdate.zoomOut());
  }

  // arreter le timer lorsque on arrete le tracking de la position
  void _stopLocationUpdates() async {
    print("Stop Location Tracking");
    _locationUpdateTimer?.cancel();

    setState(() {
      _isTracking = false;
    });

    setState(() {
      _markers
          .removeWhere((marker) => marker.markerId.value == 'currentLocation');
    });
    _polylinePoints.clear();

    // Save tournees to Firestore
    final FirebaseAuth auth = FirebaseAuth.instance;
    final User? user = auth.currentUser;
    if (user != null) {
      final FirebaseFirestore _firestore = FirebaseFirestore.instance;
      final CollectionReference tourneesRef =
          _firestore.collection('tourneesRealisees');
      final String agentId = user.uid;

      await tourneesRef.add({
        "id": id,
        'startDate': startDate,
        'agentId': agentId,
        'endDate': DateTime.now(),
        'supervisorId': await IncidentReport.getSupervisorId(agentId)
      });

      print('Tournees saved to Firestore');
    }
  }

  // Quand on ferme le Map on va détruire le timer
  @override
  void dispose() {
    _locationUpdateTimer?.cancel();
    super.dispose();
  }
}
