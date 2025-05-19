# MediConnect Conferencing application

## OverView

Our project idea was to design a system where doctors can meet/consult patients remotely over a video/audio call. As we know there are many already available solutions where doctors and patient can consult over a video call (Hangouts, Skype, Zoom, Google Meet etc.), what our design provides which is unique/different from these already available solutions ?

* #### Peer to Peer Connection
   For WebRTC connection, what we will need is a signaling server. The job of this signaling server would be to help the peers connect before establishing a peer to peer connection.
   
   Once the peer to peer connection is established, the signaling server will become obsolete and it won't be required. Even if you disconnect the signaling server while the video call is still going on, you won't face any kind of disconnections. Once the connection is established, the entire thing becomes peer to peer so we can have a secure video chat without worrying about the security issues.

* #### Multi-Stream Video Conferences
   In this app, any user can add multiple streams over the same connection.Why would we require such a functionality ?
   With this functionality in the patient side there can be devices connected to his/her PC and doctor can see output of it while having conversation with the patient simultaneously.

* #### No requirement of sharing ID's
   One another feature of this app is there no requirement to share ID's with which the doctors and patient gets connected. When the patient calls any doctor, the notification reaches to the doctor in real time (if he is logged in, in case the doctor is not logged in, the call will be stored in backend as pending and the notification will reach doctor when he logs in) and he/she has to just click a button to accept/reject calls.