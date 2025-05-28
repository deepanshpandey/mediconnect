# MediConnect Conferencing application

## OverView

Our project idea was to design a system where doctors can meet/consult patients remotely over a video/audio call. As we know, there are many solutions available for video consultations (e.g., Hangouts, Skype, Zoom, Google Meet), so what makes our design unique?

### Peer to Peer Connection

For a WebRTC connection, a signaling server is needed to help establish the connection between peers. Once the connection is established, the signaling server becomes obsolete—disconnecting it will not disrupt the ongoing video call, ensuring a secure, peer-to-peer video chat.

### Multi-Stream Video Conferences

In this application, users can add multiple streams over the same connection. This functionality allows, for example, a patient to connect additional devices so that a doctor can view multiple outputs simultaneously during a consultation.

### No Requirement for Sharing IDs

Another feature is that there is no need to share IDs. When a patient calls a doctor, the notification is delivered instantly if the doctor is online. If not, the call is saved as pending in the backend, and the notification appears once the doctor logs in. The doctor can then simply click a button to accept or reject the call.

### Additional Commands

the below allows tasks to be backgrounded and run in parallel

```bash
sudo apt-get install -y tmux
```

### Allow Passwordless sudo for ansible-playbook

Run the following command:

```bash
sudo visudo
```

Then, add this line at the bottom of the file:

```bash
jenkins ALL=(<your-user-name>) NOPASSWD: /usr/bin/ansible-playbook
```

Replace `/usr/bin/ansible-playbook` with the correct path if it's different (use `which ansible-playbook` to verify the path).
