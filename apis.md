1. Authentication APIs 1.1 Login Used in: LoginScreen.js - When user submits login
form http Copy POST /api/v1/auth/login Content-Type: application/json Request
Body: JSON Copy { "email": "user@example.com", "password":
"SecurePassword123" } Success Response (200): JSON Copy { "success": true,
"data": { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "refreshToken":
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "user": { "id": "uuid", "firstName":
"John", "lastName": "Doe", "email": "user@example.com", "avatar":
"https://cdn.example.com/avatars/uuid.jpg", "currency": "USD", "createdAt":
"2024-01-15T10:30:00Z" } } } Error Response (401): JSON Copy { "success": false,
"message": "Invalid email or password" } 1.2 Register Used in: RegisterScreen.js -
When user submits registration form http Copy POST /api/v1/auth/register
Content-Type: application/json Request Body: JSON Copy { "firstName": "John",
"lastName": "Doe", "email": "user@example.com", "password":
"SecurePassword123" } Success Response (201): JSON Copy { "success": true,
"message": "Registration successful. Please verify your email.", "data": { "userId":
"uuid", "email": "user@example.com" } } Error Response (400): JSON Copy {
"success": false, "message": "Email already exists" } 1.3 Logout Used in:
ProfileScreen.js - When user clicks logout http Copy POST /api/v1/auth/logout
Authorization: Bearer {token} Content-Type: application/json Request Body:
JSON Copy { "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } Success
Response (200): JSON Copy { "success": true, "message": "Logged out
successfully" } 1.4 Refresh Token Used in: axiosClient.js - Automatically when
access token expires (401) http Copy POST /api/v1/auth/refresh Content-Type:
application/json Request Body: JSON Copy { "refreshToken":
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } Success Response (200): JSON Copy {
"success": true, "data": { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } } Error Response
(401): JSON Copy { "success": false, "message": "Invalid refresh token" } 1.5
Forgot Password Used in: ForgotPasswordScreen.js - When user requests
password reset http Copy POST /api/v1/auth/forgot-password Content-Type:
application/json Request Body: JSON Copy { "email": "user@example.com" }
Success Response (200): JSON Copy { "success": true, "message": "Password
reset link sent to your email" } 1.6 Reset Password Used in: (Deep link from
email) - When user sets new password http Copy POST /api/v1/auth/resetpassword Content-Type: application/json Request Body: JSON Copy { "token":
"reset-token-from-email", "password": "NewSecurePassword123" } Success
Response (200): JSON Copy { "success": true, "message": "Password reset
successful" } 1.7 Verify Email Used in: (Deep link from email) - After registration
http Copy POST /api/v1/auth/verify-email Content-Type: application/json
3/15/26, 7:29 AM
Generated with https://kome.ai
Request Body: JSON Copy { "token": "verification-token-from-email" } Success
Response (200): JSON Copy { "success": true, "message": "Email verified
successfully" }
2. User APIs 2.1 Get Current User (Me) Used in: useAuth.js hook - On app load to
check auth status, ProfileScreen.js http Copy GET /api/v1/users/me
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "data": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email":
"user@example.com", "phone": "+1234567890", "avatar":
"https://cdn.example.com/avatars/uuid.jpg", "currency": "USD", "totalExpenses":
150, "totalGroups": 5, "totalFriends": 12, "createdAt": "2024-01-15T10:30:00Z",
"updatedAt": "2024-03-15T14:20:00Z" } } 2.2 Update Profile Used in:
EditProfileScreen.js - When user saves profile changes http Copy PUT
/api/v1/users/me Authorization: Bearer {token} Content-Type: application/json
Request Body: JSON Copy { "firstName": "John", "lastName": "Doe", "email":
"user@example.com", "phone": "+1234567890", "currency": "EUR" } Success
Response (200): JSON Copy { "success": true, "data": { "id": "uuid", "firstName":
"John", "lastName": "Doe", "email": "user@example.com", "phone":
"+1234567890", "avatar": "https://cdn.example.com/avatars/uuid.jpg",
"currency": "EUR", "updatedAt": "2024-03-15T14:25:00Z" } } 2.3 Change
Password Used in: ChangePasswordScreen.js - When user changes password
http Copy POST /api/v1/users/change-password Authorization: Bearer {token}
Content-Type: application/json Request Body: JSON Copy { "currentPassword":
"OldPassword123", "newPassword": "NewSecurePassword123" } Success
Response (200): JSON Copy { "success": true, "message": "Password changed
successfully" } Error Response (400): JSON Copy { "success": false, "message":
"Current password is incorrect" } 2.4 Upload Avatar Used in: EditProfileScreen.js
- When user uploads profile picture http Copy POST /api/v1/users/avatar
Authorization: Bearer {token} Content-Type: multipart/form-data Request Body
(multipart): plain Copy avatar: (binary file) Success Response (200): JSON Copy {
"success": true, "data": { "avatar": "https://cdn.example.com/avatars/uuid.jpg" } }
2.5 Delete Account Used in: ProfileScreen.js - When user deletes account http
Copy DELETE /api/v1/users/me Authorization: Bearer {token} Success Response
(200): JSON Copy { "success": true, "message": "Account deleted successfully" }
2.6 Search Users Used in: AddFriendScreen.js - When searching for friends by
email/name http Copy GET /api/v1/users/search?q={query}&page=1&limit=20
Authorization: Bearer {token} Query Parameters: q: Search query (email or
name) page: Page number (default: 1) limit: Items per page (default: 20) Success
Response (200): JSON Copy { "success": true, "data": { "users": [ { "id": "uuid",
3/15/26, 7:29 AM
Generated with https://kome.ai
"firstName": "Jane", "lastName": "Smith", "email": "jane@example.com", "avatar":
"https://cdn.example.com/avatars/uuid.jpg" } ], "total": 1, "page": 1, "limit": 20 } }
3. Friend APIs 3.1 Get Friends List Used in: FriendsListScreen.js - On screen load,
useFriends hook http Copy GET /api/v1/friends?page=1&limit=20 Authorization:
Bearer {token} Success Response (200): JSON Copy { "success": true, "data": [ {
"id": "friend-uuid", "firstName": "Jane", "lastName": "Smith", "email":
"jane@example.com", "avatar": "https://cdn.example.com/avatars/uuid.jpg",
"friendSince": "2024-02-01T10:00:00Z" } ] } 3.2 Get Friend Requests Used in:
FriendRequestsScreen.js - On screen load, FriendsListScreen.js (badge count)
http Copy GET /api/v1/friends/requests Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "data": [ { "id": "request-uuid",
"fromUser": { "id": "user-uuid", "firstName": "Bob", "lastName": "Wilson", "email":
"bob@example.com", "avatar": "https://cdn.example.com/avatars/uuid.jpg" },
"toUser": { "id": "current-user-uuid", "firstName": "John", "lastName": "Doe",
"email": "user@example.com" }, "status": "pending", "direction": "incoming",
"createdAt": "2024-03-10T08:30:00Z" } ] } 3.3 Send Friend Request Used in:
AddFriendScreen.js - When user sends friend request http Copy POST
/api/v1/friends/request Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "email": "friend@example.com" }
Success Response (201): JSON Copy { "success": true, "message": "Friend request
sent", "data": { "id": "request-uuid", "status": "pending", "createdAt": "2024-03-
15T10:00:00Z" } } Error Response (404): JSON Copy { "success": false, "message":
"User not found with this email" } Error Response (409): JSON Copy { "success":
false, "message": "Friend request already pending or users are already friends" }
3.4 Accept Friend Request Used in: FriendRequestsScreen.js - When user
accepts request http Copy POST /api/v1/friends/requests/{requestId}/accept
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "message": "Friend request accepted", "data": { "friendshipId": "friendshipuuid", "friend": { "id": "user-uuid", "firstName": "Bob", "lastName": "Wilson",
"email": "bob@example.com", "avatar":
"https://cdn.example.com/avatars/uuid.jpg" } } } 3.5 Reject Friend Request Used
in: FriendRequestsScreen.js - When user rejects request http Copy POST
/api/v1/friends/requests/{requestId}/reject Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "message": "Friend request
rejected" } 3.6 Remove Friend Used in: FriendsListScreen.js,
FriendProfileScreen.js - When user removes friend http Copy DELETE
/api/v1/friends/{friendId} Authorization: Bearer {token} Success Response (200):
JSON Copy { "success": true, "message": "Friend removed successfully" } 3.7 Get
Friend Balances Used in: DashboardScreen.js, FriendsListScreen.js, useFriends
3/15/26, 7:29 AM
Generated with https://kome.ai
hook http Copy GET /api/v1/friends/balances Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "data": [ { "friendId":
"friend-uuid", "friend": { "id": "friend-uuid", "firstName": "Jane", "lastName":
"Smith", "email": "jane@example.com", "avatar":
"https://cdn.example.com/avatars/uuid.jpg" }, "amount": 45.50, "currency":
"USD", "youOwe": false, "lastActivity": "2024-03-14T16:30:00Z" }, { "friendId":
"friend-uuid-2", "friend": { "id": "friend-uuid-2", "firstName": "Bob", "lastName":
"Wilson", "email": "bob@example.com", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg" }, "amount": -23.75, "currency":
"USD", "youOwe": true, "lastActivity": "2024-03-13T10:15:00Z" } ] } 3.8 Get Friend
Details Used in: FriendProfileScreen.js - When viewing friend profile http Copy
GET /api/v1/friends/{friendId} Authorization: Bearer {token} Success Response
(200): JSON Copy { "success": true, "data": { "id": "friend-uuid", "firstName":
"Jane", "lastName": "Smith", "email": "jane@example.com", "avatar":
"https://cdn.example.com/avatars/uuid.jpg", "friendSince": "2024-02-
01T10:00:00Z", "totalExpensesTogether": 25, "balance": { "amount": 45.50,
"currency": "USD", "youOwe": false } } }
4. Group APIs 4.1 Get Groups List Used in: GroupsListScreen.js - On screen load
http Copy GET /api/v1/groups?page=1&limit=20 Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "data": [ { "id": "groupuuid", "name": "Weekend Trip to Vegas", "description": "Spring break 2024",
"members": [ { "id": "user-uuid-1", "firstName": "John", "lastName": "Doe",
"avatar": "https://cdn.example.com/avatars/uuid1.jpg", "isAdmin": true }, { "id":
"user-uuid-2", "firstName": "Jane", "lastName": "Smith", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg", "isAdmin": false } ],
"totalExpenses": 1250.00, "currency": "USD", "userBalance": 150.00, "createdAt":
"2024-03-01T10:00:00Z", "updatedAt": "2024-03-14T18:30:00Z" } ] } 4.2 Create
Group Used in: CreateGroupScreen.js - When creating new group http Copy
POST /api/v1/groups Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "name": "Weekend Trip to Vegas",
"description": "Spring break 2024", "members": ["user-uuid-1", "user-uuid-2",
"user-uuid-3"], "currency": "USD" } Success Response (201): JSON Copy {
"success": true, "data": { "id": "group-uuid", "name": "Weekend Trip to Vegas",
"description": "Spring break 2024", "members": [ { "id": "current-user-uuid",
"firstName": "John", "lastName": "Doe", "isAdmin": true }, { "id": "user-uuid-2",
"firstName": "Jane", "lastName": "Smith", "isAdmin": false }, { "id": "user-uuid-3",
"firstName": "Bob", "lastName": "Wilson", "isAdmin": false } ], "currency": "USD",
"createdAt": "2024-03-15T10:00:00Z" } } 4.3 Get Group Details Used in:
GroupDetailsScreen.js - On screen load http Copy GET /api/v1/groups/{groupId}
3/15/26, 7:29 AM
Generated with https://kome.ai
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "data": { "id": "group-uuid", "name": "Weekend Trip to Vegas",
"description": "Spring break 2024", "currency": "USD", "simplifyDebts": true,
"members": [ { "id": "user-uuid-1", "firstName": "John", "lastName": "Doe",
"email": "john@example.com", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg", "isAdmin": true, "isCurrentUser":
true, "joinedAt": "2024-03-01T10:00:00Z" }, { "id": "user-uuid-2", "firstName":
"Jane", "lastName": "Smith", "email": "jane@example.com", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg", "isAdmin": false, "isCurrentUser":
false, "joinedAt": "2024-03-01T10:30:00Z" } ], "totalExpenses": 1250.00,
"userBalance": 150.00, "balances": [ { "userId": "user-uuid-1", "user": { "id": "useruuid-1", "firstName": "John", "lastName": "Doe", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg" }, "paid": 500.00, "owed": 350.00,
"net": 150.00 }, { "userId": "user-uuid-2", "user": { "id": "user-uuid-2", "firstName":
"Jane", "lastName": "Smith", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg" }, "paid": 750.00, "owed": 900.00,
"net": -150.00 } ], "createdAt": "2024-03-01T10:00:00Z", "updatedAt": "2024-03-
14T18:30:00Z" } } 4.4 Update Group Used in: GroupSettingsScreen.js - When
saving group settings http Copy PUT /api/v1/groups/{groupId} Authorization:
Bearer {token} Content-Type: application/json Request Body: JSON Copy {
"name": "Updated Group Name", "description": "Updated description",
"currency": "EUR", "simplifyDebts": true } Success Response (200): JSON Copy {
"success": true, "data": { "id": "group-uuid", "name": "Updated Group Name",
"description": "Updated description", "currency": "EUR", "simplifyDebts": true,
"updatedAt": "2024-03-15T11:00:00Z" } } 4.5 Delete Group Used in:
GroupDetailsScreen.js, GroupSettingsScreen.js - When deleting group http Copy
DELETE /api/v1/groups/{groupId} Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "message": "Group deleted
successfully" } 4.6 Get Group Members Used in: GroupMembersScreen.js -
When viewing/managing members http Copy GET
/api/v1/groups/{groupId}/members Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "data": [ { "id": "user-uuid-1",
"firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg", "isAdmin": true, "isCurrentUser":
true, "joinedAt": "2024-03-01T10:00:00Z" }, { "id": "user-uuid-2", "firstName":
"Jane", "lastName": "Smith", "email": "jane@example.com", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg", "isAdmin": false, "isCurrentUser":
false, "joinedAt": "2024-03-01T10:30:00Z" } ] } 4.7 Add Member to Group Used in:
GroupMembersScreen.js - When adding new member http Copy POST
3/15/26, 7:29 AM
Generated with https://kome.ai
/api/v1/groups/{groupId}/members Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "userId": "user-uuid-to-add" }
Success Response (201): JSON Copy { "success": true, "data": { "id": "user-uuidto-add", "firstName": "Bob", "lastName": "Wilson", "email": "bob@example.com",
"avatar": "https://cdn.example.com/avatars/uuid3.jpg", "isAdmin": false,
"joinedAt": "2024-03-15T12:00:00Z" } } 4.8 Remove Member from Group Used in:
GroupMembersScreen.js - When removing member http Copy DELETE
/api/v1/groups/{groupId}/members/{userId} Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "message": "Member
removed successfully" } 4.9 Get Group Expenses Used in: GroupDetailsScreen.js
- When viewing group expenses tab http Copy GET
/api/v1/groups/{groupId}/expenses?page=1&limit=20 Authorization: Bearer
{token} Success Response (200): JSON Copy { "success": true, "data": [ { "id":
"expense-uuid", "description": "Dinner at Italian Place", "amount": 120.00,
"currency": "USD", "paidBy": { "id": "user-uuid-1", "firstName": "John",
"lastName": "Doe", "isCurrentUser": true }, "createdAt": "2024-03-14T19:30:00Z",
"userShare": 40.00 } ] } 4.10 Settle Group Used in: (Group settlement feature)
http Copy POST /api/v1/groups/{groupId}/settle Authorization: Bearer {token}
Content-Type: application/json Request Body: JSON Copy { "settlements": [ {
"fromUserId": "user-uuid-1", "toUserId": "user-uuid-2", "amount": 150.00 } ] }
Success Response (200): JSON Copy { "success": true, "message": "Group settled
successfully" }
5. Expense APIs 5.1 Get Expenses Used in: ExpenseListScreen.js, useExpenses
hook, DashboardScreen.js http Copy GET /api/v1/expenses?
page=1&limit=20&groupId=&friendId=&startDate=&endDate=&category=
Authorization: Bearer {token} Query Parameters: page: Page number limit:
Items per page groupId: Filter by group (optional) friendId: Filter by friend
(optional) startDate: Filter from date (ISO format, optional) endDate: Filter to
date (ISO format, optional) category: Filter by category ID (optional) Success
Response (200): JSON Copy { "success": true, "data": { "expenses": [ { "id":
"expense-uuid", "description": "Grocery shopping", "amount": 85.50, "currency":
"USD", "category": { "id": "food", "name": "Food & Dining", "icon": "food", "color":
"#FF5722" }, "paidBy": { "id": "user-uuid-1", "firstName": "John", "lastName":
"Doe", "isCurrentUser": true }, "group": { "id": "group-uuid", "name": "Apartment"
}, "date": "2024-03-14T10:00:00Z", "createdAt": "2024-03-14T10:05:00Z", "notes":
"Weekly groceries", "receipt": "https://cdn.example.com/receipts/uuid.jpg",
"participants": [ { "userId": "user-uuid-1", "firstName": "John", "lastName": "Doe",
"isCurrentUser": true, "amountOwed": 42.75, "percentage": 50, "shares": 1 }, {
"userId": "user-uuid-2", "firstName": "Jane", "lastName": "Smith",
3/15/26, 7:29 AM
Generated with https://kome.ai
"isCurrentUser": false, "amountOwed": 42.75, "percentage": 50, "shares": 1 } ],
"userShare": 42.75, "split": { "type": "equal", "participants": [ {"userId": "useruuid-1", "amount": 42.75, "percentage": 50, "shares": 1}, {"userId": "user-uuid-2",
"amount": 42.75, "percentage": 50, "shares": 1} ] } } ], "total": 150, "page": 1,
"limit": 20 } } 5.2 Create Expense Used in: CreateExpenseScreen.js,
AddExpenseScreen.js - When adding new expense http Copy POST
/api/v1/expenses Authorization: Bearer {token} Content-Type: application/json
Request Body: JSON Copy { "description": "Dinner with friends", "amount":
120.00, "currency": "USD", "category": "food", "date": "2024-03-14T19:00:00Z",
"notes": "Birthday celebration", "groupId": "group-uuid", "paidById": "user-uuid1", "split": { "type": "equal", "participants": [ {"userId": "user-uuid-1", "amount":
40.00, "percentage": 33.33, "shares": 1}, {"userId": "user-uuid-2", "amount":
40.00, "percentage": 33.33, "shares": 1}, {"userId": "user-uuid-3", "amount":
40.00, "percentage": 33.34, "shares": 1} ] } } Success Response (201): JSON Copy {
"success": true, "data": { "id": "expense-uuid", "description": "Dinner with
friends", "amount": 120.00, "currency": "USD", "category": { "id": "food", "name":
"Food & Dining", "icon": "food", "color": "#FF5722" }, "paidBy": { "id": "user-uuid1", "firstName": "John", "lastName": "Doe", "isCurrentUser": true }, "date": "2024-
03-14T19:00:00Z", "createdAt": "2024-03-14T19:05:00Z", "notes": "Birthday
celebration", "participants": [ { "userId": "user-uuid-1", "firstName": "John",
"lastName": "Doe", "isCurrentUser": true, "amountOwed": 40.00 }, { "userId":
"user-uuid-2", "firstName": "Jane", "lastName": "Smith", "isCurrentUser": false,
"amountOwed": 40.00 }, { "userId": "user-uuid-3", "firstName": "Bob",
"lastName": "Wilson", "isCurrentUser": false, "amountOwed": 40.00 } ], "split": {
"type": "equal", "participants": [ {"userId": "user-uuid-1", "amount": 40.00,
"percentage": 33.33, "shares": 1}, {"userId": "user-uuid-2", "amount": 40.00,
"percentage": 33.33, "shares": 1}, {"userId": "user-uuid-3", "amount": 40.00,
"percentage": 33.34, "shares": 1} ] } } } 5.3 Get Expense Details Used in:
ExpenseDetailsScreen.js - When viewing expense details http Copy GET
/api/v1/expenses/{expenseId} Authorization: Bearer {token} Success Response
(200): JSON Copy { "success": true, "data": { "id": "expense-uuid", "description":
"Dinner with friends", "amount": 120.00, "currency": "USD", "category": { "id":
"food", "name": "Food & Dining", "icon": "food", "color": "#FF5722" }, "paidBy": {
"id": "user-uuid-1", "firstName": "John", "lastName": "Doe", "email":
"john@example.com", "avatar": "https://cdn.example.com/avatars/uuid1.jpg",
"isCurrentUser": true }, "group": { "id": "group-uuid", "name": "Weekend Trip" },
"date": "2024-03-14T19:00:00Z", "createdAt": "2024-03-14T19:05:00Z",
"createdBy": { "id": "user-uuid-1", "firstName": "John", "lastName": "Doe" },
"notes": "Birthday celebration", "receipt":
3/15/26, 7:29 AM
Generated with https://kome.ai
"https://cdn.example.com/receipts/uuid.jpg", "participants": [ { "userId": "useruuid-1", "firstName": "John", "lastName": "Doe", "email": "john@example.com",
"avatar": "https://cdn.example.com/avatars/uuid1.jpg", "isCurrentUser": true,
"amountOwed": 40.00, "percentage": 33.33, "shares": 1, "settled": false }, {
"userId": "user-uuid-2", "firstName": "Jane", "lastName": "Smith", "email":
"jane@example.com", "avatar": "https://cdn.example.com/avatars/uuid2.jpg",
"isCurrentUser": false, "amountOwed": 40.00, "percentage": 33.33, "shares": 1,
"settled": false } ], "split": { "type": "equal", "participants": [ {"userId": "user-uuid1", "amount": 40.00, "percentage": 33.33, "shares": 1}, {"userId": "user-uuid-2",
"amount": 40.00, "percentage": 33.33, "shares": 1}, {"userId": "user-uuid-3",
"amount": 40.00, "percentage": 33.34, "shares": 1} ] }, "comments": [ { "id":
"comment-uuid", "user": { "id": "user-uuid-2", "firstName": "Jane", "lastName":
"Smith", "avatar": "https://cdn.example.com/avatars/uuid2.jpg" }, "text": "Thanks
for covering!", "createdAt": "2024-03-14T20:00:00Z" } ] } } 5.4 Update Expense
Used in: EditExpenseScreen.js - When editing expense http Copy PUT
/api/v1/expenses/{expenseId} Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "description": "Updated
description", "amount": 130.00, "currency": "USD", "category": "food", "date":
"2024-03-14T19:00:00Z", "notes": "Updated notes" } Success Response (200):
JSON Copy { "success": true, "data": { "id": "expense-uuid", "description":
"Updated description", "amount": 130.00, "updatedAt": "2024-03-15T10:00:00Z"
} } 5.5 Delete Expense Used in: ExpenseDetailsScreen.js, EditExpenseScreen.js -
When deleting expense http Copy DELETE /api/v1/expenses/{expenseId}
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "message": "Expense deleted successfully" } 5.6 Upload Receipt Used in:
CreateExpenseScreen.js, EditExpenseScreen.js - After creating/updating expense
with image http Copy POST /api/v1/expenses/{expenseId}/receipt Authorization:
Bearer {token} Content-Type: multipart/form-data Request Body (multipart):
plain Copy receipt: (binary image file) Success Response (200): JSON Copy {
"success": true, "data": { "receipt": "https://cdn.example.com/receipts/uuid.jpg" }
} 5.7 Update Split Used in: SplitExpenseScreen.js - When modifying how expense
is split http Copy PUT /api/v1/expenses/{expenseId}/split Authorization: Bearer
{token} Content-Type: application/json Request Body: JSON Copy { "type":
"percentage", "participants": [ {"userId": "user-uuid-1", "amount": 60.00,
"percentage": 50, "shares": 1}, {"userId": "user-uuid-2", "amount": 30.00,
"percentage": 25, "shares": 1}, {"userId": "user-uuid-3", "amount": 30.00,
"percentage": 25, "shares": 1} ] } Success Response (200): JSON Copy { "success":
true, "data": { "id": "expense-uuid", "split": { "type": "percentage", "participants": [
{"userId": "user-uuid-1", "amount": 60.00, "percentage": 50, "shares": 1},
3/15/26, 7:29 AM
Generated with https://kome.ai
{"userId": "user-uuid-2", "amount": 30.00, "percentage": 25, "shares": 1},
{"userId": "user-uuid-3", "amount": 30.00, "percentage": 25, "shares": 1} ] },
"participants": [ { "userId": "user-uuid-1", "firstName": "John", "lastName": "Doe",
"amountOwed": 60.00 }, { "userId": "user-uuid-2", "firstName": "Jane",
"lastName": "Smith", "amountOwed": 30.00 }, { "userId": "user-uuid-3",
"firstName": "Bob", "lastName": "Wilson", "amountOwed": 30.00 } ] } } 5.8 Get
Expense Comments Used in: ExpenseDetailsScreen.js - Loading comments
section http Copy GET /api/v1/expenses/{expenseId}/comments Authorization:
Bearer {token} Success Response (200): JSON Copy { "success": true, "data": [ {
"id": "comment-uuid", "user": { "id": "user-uuid-2", "firstName": "Jane",
"lastName": "Smith", "avatar": "https://cdn.example.com/avatars/uuid2.jpg" },
"text": "Thanks for covering dinner!", "createdAt": "2024-03-14T20:00:00Z" } ] }
5.9 Add Comment Used in: ExpenseDetailsScreen.js - When user adds comment
http Copy POST /api/v1/expenses/{expenseId}/comments Authorization: Bearer
{token} Content-Type: application/json Request Body: JSON Copy { "text":
"Thanks for covering dinner!" } Success Response (201): JSON Copy { "success":
true, "data": { "id": "comment-uuid", "user": { "id": "current-user-uuid",
"firstName": "John", "lastName": "Doe", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg" }, "text": "Thanks for covering
dinner!", "createdAt": "2024-03-14T20:05:00Z" } }
6. Settlement APIs 6.1 Get Settlements Used in: SettlementsScreen.js,
SettlementHistoryScreen.js http Copy GET /api/v1/settlements?
page=1&limit=20&status=pending&friendId= Authorization: Bearer {token}
Query Parameters: page: Page number limit: Items per page status: pending or
completed friendId: Filter by friend (optional) Success Response (200): JSON
Copy { "success": true, "data": { "settlements": [ { "id": "settlement-uuid",
"amount": 45.50, "currency": "USD", "fromUser": { "id": "user-uuid-1",
"firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg", "isCurrentUser": true }, "toUser": {
"id": "user-uuid-2", "firstName": "Jane", "lastName": "Smith", "email":
"jane@example.com", "avatar": "https://cdn.example.com/avatars/uuid2.jpg",
"isCurrentUser": false }, "status": "pending", "paymentMethod": "cash", "note":
"Paid in cash at lunch", "date": "2024-03-14T12:00:00Z", "createdAt": "2024-03-
14T12:05:00Z", "relatedExpenses": ["expense-uuid-1", "expense-uuid-2"] } ],
"total": 5, "page": 1, "limit": 20 } } 6.2 Create Settlement Used in:
SettleDebtScreen.js - When recording a payment http Copy POST
/api/v1/settlements Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "toUserId": "user-uuid-2", "amount":
45.50, "currency": "USD", "paymentMethod": "cash", "note": "Paid in cash at
3/15/26, 7:29 AM
Generated with https://kome.ai
lunch", "date": "2024-03-14T12:00:00Z", "relatedExpenses": ["expense-uuid-1",
"expense-uuid-2"] } Success Response (201): JSON Copy { "success": true, "data":
{ "id": "settlement-uuid", "amount": 45.50, "currency": "USD", "fromUser": { "id":
"user-uuid-1", "firstName": "John", "lastName": "Doe", "isCurrentUser": true },
"toUser": { "id": "user-uuid-2", "firstName": "Jane", "lastName": "Smith",
"isCurrentUser": false }, "status": "pending", "paymentMethod": "cash", "note":
"Paid in cash at lunch", "date": "2024-03-14T12:00:00Z", "createdAt": "2024-03-
14T12:05:00Z" } } 6.3 Get Settlement Details Used in: (Settlement detail view)
http Copy GET /api/v1/settlements/{settlementId} Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "data": { "id": "settlementuuid", "amount": 45.50, "currency": "USD", "fromUser": { "id": "user-uuid-1",
"firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg", "isCurrentUser": true }, "toUser": {
"id": "user-uuid-2", "firstName": "Jane", "lastName": "Smith", "email":
"jane@example.com", "avatar": "https://cdn.example.com/avatars/uuid2.jpg",
"isCurrentUser": false }, "status": "pending", "paymentMethod": "cash", "note":
"Paid in cash at lunch", "date": "2024-03-14T12:00:00Z", "createdAt": "2024-03-
14T12:05:00Z", "confirmedAt": null, "relatedExpenses": [ { "id": "expense-uuid-1",
"description": "Dinner", "amount": 25.00 }, { "id": "expense-uuid-2", "description":
"Taxi", "amount": 20.50 } ] } } 6.4 Update Settlement Used in: (Edit settlement -
rarely used) http Copy PUT /api/v1/settlements/{settlementId} Authorization:
Bearer {token} Content-Type: application/json Request Body: JSON Copy {
"note": "Updated note", "paymentMethod": "bank_transfer" } Success Response
(200): JSON Copy { "success": true, "data": { "id": "settlement-uuid", "note":
"Updated note", "paymentMethod": "bank_transfer", "updatedAt": "2024-03-
15T10:00:00Z" } } 6.5 Delete Settlement Used in: (Cancel pending settlement)
http Copy DELETE /api/v1/settlements/{settlementId} Authorization: Bearer
{token} Success Response (200): JSON Copy { "success": true, "message":
"Settlement cancelled successfully" } 6.6 Confirm Settlement (Receiver confirms
they got paid) Used in: SettlementsScreen.js - When recipient confirms receipt
http Copy POST /api/v1/settlements/{settlementId}/confirm Authorization:
Bearer {token} Success Response (200): JSON Copy { "success": true, "data": {
"id": "settlement-uuid", "status": "completed", "confirmedAt": "2024-03-
15T10:30:00Z" } }
7. Transaction APIs (Personal Finance) 7.1 Get Transactions Used in:
TransactionListScreen.js, personal finance tracking http Copy GET
/api/v1/transactions?
page=1&limit=20&type=expense&category=&startDate=&endDate=
Authorization: Bearer {token} Query Parameters: page: Page number limit:
3/15/26, 7:29 AM
Generated with https://kome.ai
Items per page type: expense or income category: Category ID filter startDate:
Start date filter endDate: End date filter Success Response (200): JSON Copy {
"success": true, "data": { "transactions": [ { "id": "transaction-uuid", "description":
"Salary", "amount": 5000.00, "type": "income", "currency": "USD", "category": {
"id": "salary", "name": "Salary", "icon": "cash", "color": "#4CAF50" }, "date": "2024-
03-01T09:00:00Z", "notes": "Monthly salary", "receipt": null, "createdAt": "2024-
03-01T09:05:00Z" }, { "id": "transaction-uuid-2", "description": "Grocery
shopping", "amount": 85.50, "type": "expense", "currency": "USD", "category": {
"id": "food", "name": "Food & Dining", "icon": "food", "color": "#FF5722" }, "date":
"2024-03-05T18:30:00Z", "notes": "Weekly groceries", "receipt":
"https://cdn.example.com/receipts/uuid.jpg", "createdAt": "2024-03-
05T18:35:00Z" } ], "total": 150, "page": 1, "limit": 20 } } 7.2 Create Transaction
Used in: AddExpenseScreen.js, AddIncomeScreen.js - Personal transactions http
Copy POST /api/v1/transactions Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "description": "Freelance payment",
"amount": 500.00, "type": "income", "currency": "USD", "category": "freelance",
"date": "2024-03-10T14:00:00Z", "notes": "Website design project" } Success
Response (201): JSON Copy { "success": true, "data": { "id": "transaction-uuid",
"description": "Freelance payment", "amount": 500.00, "type": "income",
"currency": "USD", "category": { "id": "freelance", "name": "Freelance", "icon":
"laptop", "color": "#2196F3" }, "date": "2024-03-10T14:00:00Z", "notes": "Website
design project", "createdAt": "2024-03-10T14:05:00Z" } } 7.3 Get Transaction
Details Used in: TransactionDetailsScreen.js http Copy GET
/api/v1/transactions/{transactionId} Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "data": { "id": "transaction-uuid",
"description": "Freelance payment", "amount": 500.00, "type": "income",
"currency": "USD", "category": { "id": "freelance", "name": "Freelance", "icon":
"laptop", "color": "#2196F3" }, "date": "2024-03-10T14:00:00Z", "notes": "Website
design project", "receipt": null, "createdAt": "2024-03-10T14:05:00Z",
"updatedAt": "2024-03-10T14:05:00Z" } } 7.4 Update Transaction Used in:
TransactionDetailsScreen.js - Edit transaction http Copy PUT
/api/v1/transactions/{transactionId} Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "description": "Updated
description", "amount": 550.00, "category": "freelance", "date": "2024-03-
10T14:00:00Z", "notes": "Updated notes" } Success Response (200): JSON Copy {
"success": true, "data": { "id": "transaction-uuid", "description": "Updated
description", "amount": 550.00, "updatedAt": "2024-03-11T10:00:00Z" } } 7.5
Delete Transaction Used in: TransactionDetailsScreen.js http Copy DELETE
/api/v1/transactions/{transactionId} Authorization: Bearer {token} Success
3/15/26, 7:29 AM
Generated with https://kome.ai
Response (200): JSON Copy { "success": true, "message": "Transaction deleted
successfully" } 7.6 Get Transaction Categories Used in: TransactionListScreen.js,
AddExpenseScreen.js, AddIncomeScreen.js http Copy GET
/api/v1/transactions/categories?type=expense Authorization: Bearer {token}
Query Parameters: type: expense or income (optional, returns all if not
specified) Success Response (200): JSON Copy { "success": true, "data": [ { "id":
"food", "name": "Food & Dining", "icon": "food", "color": "#FF5722", "type":
"expense" }, { "id": "transport", "name": "Transportation", "icon": "car", "color":
"#2196F3", "type": "expense" }, { "id": "salary", "name": "Salary", "icon": "cash",
"color": "#4CAF50", "type": "income" }, { "id": "freelance", "name": "Freelance",
"icon": "laptop", "color": "#2196F3", "type": "income" } ] }
8. Notification APIs 8.1 Get Notifications Used in: NotificationsScreen.js,
MainNavigator.js (badge count) http Copy GET /api/v1/notifications?
page=1&limit=20 Authorization: Bearer {token} Success Response (200): JSON
Copy { "success": true, "data": { "notifications": [ { "id": "notification-uuid", "type":
"friend_request", "title": "New Friend Request", "message": "Bob Wilson sent you
a friend request", "read": false, "createdAt": "2024-03-15T10:00:00Z", "sender": {
"id": "user-uuid", "firstName": "Bob", "lastName": "Wilson", "avatar":
"https://cdn.example.com/avatars/uuid.jpg" }, "data": { "requestId": "requestuuid" } }, { "id": "notification-uuid-2", "type": "expense_created", "title": "New
Expense", "message": "Jane Smith added 'Dinner at Italian Place' for $120.00",
"read": true, "createdAt": "2024-03-14T19:35:00Z", "sender": { "id": "user-uuid-2",
"firstName": "Jane", "lastName": "Smith", "avatar":
"https://cdn.example.com/avatars/uuid2.jpg" }, "data": { "expenseId": "expenseuuid", "groupId": "group-uuid" } }, { "id": "notification-uuid-3", "type":
"settlement_completed", "title": "Payment Received", "message": "John Doe
confirmed your $45.50 payment", "read": false, "createdAt": "2024-03-
14T12:30:00Z", "sender": { "id": "user-uuid-1", "firstName": "John", "lastName":
"Doe", "avatar": "https://cdn.example.com/avatars/uuid1.jpg" }, "data": {
"settlementId": "settlement-uuid" } } ], "unreadCount": 2, "total": 45, "page": 1,
"limit": 20 } } 8.2 Mark Notification as Read Used in: NotificationsScreen.js -
When user taps notification http Copy POST
/api/v1/notifications/{notificationId}/read Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "data": { "id": "notification-uuid",
"read": true, "readAt": "2024-03-15T10:05:00Z" } } 8.3 Mark All Notifications as
Read Used in: NotificationsScreen.js - "Mark all as read" button http Copy POST
/api/v1/notifications/read-all Authorization: Bearer {token} Success Response
(200): JSON Copy { "success": true, "message": "All notifications marked as read",
"data": { "markedCount": 5 } } 8.4 Delete Notification Used in:
3/15/26, 7:29 AM
Generated with https://kome.ai
NotificationsScreen.js - Swipe to delete http Copy DELETE
/api/v1/notifications/{notificationId} Authorization: Bearer {token} Success
Response (200): JSON Copy { "success": true, "message": "Notification deleted" }
8.5 Get Notification Settings Used in: NotificationSettingsScreen.js - On screen
load http Copy GET /api/v1/notifications/settings Authorization: Bearer {token}
Success Response (200): JSON Copy { "success": true, "data": {
"expenseCreated": true, "expenseUpdated": true, "payments": true,
"friendRequests": true, "groupInvites": true, "reminders": true, "emailEnabled":
true, "pushEnabled": true } } 8.6 Update Notification Settings Used in:
NotificationSettingsScreen.js - When toggling settings http Copy PUT
/api/v1/notifications/settings Authorization: Bearer {token} Content-Type:
application/json Request Body: JSON Copy { "expenseCreated": true,
"expenseUpdated": false, "payments": true, "friendRequests": true,
"groupInvites": true, "reminders": false, "emailEnabled": true, "pushEnabled":
true } Success Response (200): JSON Copy { "success": true, "data": {
"expenseCreated": true, "expenseUpdated": false, "payments": true,
"friendRequests": true, "groupInvites": true, "reminders": false, "emailEnabled":
true, "pushEnabled": true } }
9. Analytics APIs 9.1 Get Dashboard Data Used in: DashboardScreen.js - Main
dashboard load http Copy GET /api/v1/analytics/dashboard Authorization:
Bearer {token} Success Response (200): JSON Copy { "success": true, "data": {
"totalBalance": 150.00, "totalOwed": 0, "totalOwe": 150.00, "currency": "USD",
"monthlyData": [ {"month": "Oct", "income": 5000, "expense": 3200}, {"month":
"Nov", "income": 5000, "expense": 2800}, {"month": "Dec", "income": 5500,
"expense": 3500}, {"month": "Jan", "income": 5000, "expense": 3000}, {"month":
"Feb", "income": 5200, "expense": 2900}, {"month": "Mar", "income": 2000,
"expense": 1500} ], "categoryBreakdown": [ { "id": "food", "name": "Food &
Dining", "amount": 450.00, "percentage": 30, "color": "#FF5722", "icon": "food",
"transactionCount": 15 }, { "id": "transport", "name": "Transportation", "amount":
300.00, "percentage": 20, "color": "#2196F3", "icon": "car", "transactionCount": 8
} ], "recentTransactions": [ { "id": "transaction-uuid", "description": "Grocery
shopping", "amount": 85.50, "type": "expense", "category": { "id": "food", "name":
"Food & Dining", "icon": "food" }, "date": "2024-03-14T10:00:00Z" } ] } } 9.2 Get
Spending by Category Used in: AnalyticsScreen.js, CategoryBreakdownScreen.js
http Copy GET /api/v1/analytics/spending-by-category?startDate=2024-03-
01&endDate=2024-03-31 Authorization: Bearer {token} Query Parameters:
startDate: Start date (ISO format) endDate: End date (ISO format) Success
Response (200): JSON Copy { "success": true, "data": [ { "id": "food", "name":
"Food & Dining", "amount": 450.00, "percentage": 30, "color": "#FF5722", "icon":
3/15/26, 7:29 AM
Generated with https://kome.ai
"food", "transactionCount": 15 }, { "id": "transport", "name": "Transportation",
"amount": 300.00, "percentage": 20, "color": "#2196F3", "icon": "car",
"transactionCount": 8 }, { "id": "shopping", "name": "Shopping", "amount":
250.00, "percentage": 16.7, "color": "#9C27B0", "icon": "shopping",
"transactionCount": 5 } ] } 9.3 Get Income vs Expense Used in: AnalyticsScreen.js
- Charts http Copy GET /api/v1/analytics/income-vs-expense?startDate=2024-03-
01&endDate=2024-03-31 Authorization: Bearer {token} Success Response (200):
JSON Copy { "success": true, "data": { "income": 5000.00, "expense": 3200.00,
"net": 1800.00, "dailyData": [ {"date": "03-01", "income": 0, "expense": 50},
{"date": "03-02", "income": 0, "expense": 120}, {"date": "03-03", "income": 0,
"expense": 0}, {"date": "03-15", "income": 5000, "expense": 200} ] } } 9.4 Get
Monthly Trends Used in: AnalyticsScreen.js, TrendsScreen.js http Copy GET
/api/v1/analytics/monthly-trends?months=6 Authorization: Bearer {token}
Query Parameters: months: Number of months to return (default: 6) Success
Response (200): JSON Copy { "success": true, "data": [ {"month": "Oct 2023",
"income": 5000, "expense": 3200}, {"month": "Nov 2023", "income": 5000,
"expense": 2800}, {"month": "Dec 2023", "income": 5500, "expense": 3500},
{"month": "Jan 2024", "income": 5000, "expense": 3000}, {"month": "Feb 2024",
"income": 5200, "expense": 2900}, {"month": "Mar 2024", "income": 2000,
"expense": 1500} ] } 9.5 Get Friend Balances for Analytics Used in:
AnalyticsScreen.js http Copy GET /api/v1/analytics/friend-balances
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "data": [ { "friendId": "friend-uuid-1", "friend": { "id": "friend-uuid-1",
"firstName": "Jane", "lastName": "Smith", "avatar":
"https://cdn.example.com/avatars/uuid1.jpg" }, "totalShared": 1250.00,
"youOwe": 0, "youAreOwed": 150.00, "netBalance": 150.00, "expenseCount": 25
}, { "friendId": "friend-uuid-2", "friend": { "id": "friend-uuid-2", "firstName": "Bob",
"lastName": "Wilson", "avatar": "https://cdn.example.com/avatars/uuid2.jpg" },
"totalShared": 800.00, "youOwe": 75.00, "youAreOwed": 0, "netBalance": -75.00,
"expenseCount": 18 } ] }
10. Category APIs 10.1 Get Categories Used in: CreateExpenseScreen.js,
EditExpenseScreen.js http Copy GET /api/v1/categories?type=expense
Authorization: Bearer {token} Query Parameters: type: expense or income
(optional) Success Response (200): JSON Copy { "success": true, "data": [ { "id":
"food", "name": "Food & Dining", "icon": "food", "color": "#FF5722", "type":
"expense", "isDefault": true }, { "id": "custom-category-uuid", "name": "Gym
Membership", "icon": "dumbbell", "color": "#4CAF50", "type": "expense",
"isDefault": false, "createdBy": "user-uuid" } ] } 10.2 Create Custom Category
Used in: (Custom category creation feature) http Copy POST /api/v1/categories
3/15/26, 7:29 AM
Generated with https://kome.ai
Authorization: Bearer {token} Content-Type: application/json Request Body:
JSON Copy { "name": "Gym Membership", "icon": "dumbbell", "color": "#4CAF50",
"type": "expense" } Success Response (201): JSON Copy { "success": true, "data":
{ "id": "custom-category-uuid", "name": "Gym Membership", "icon": "dumbbell",
"color": "#4CAF50", "type": "expense", "isDefault": false, "createdBy": "user-uuid",
"createdAt": "2024-03-15T10:00:00Z" } } 10.3 Update Category Used in: (Edit
custom category) http Copy PUT /api/v1/categories/{categoryId} Authorization:
Bearer {token} Content-Type: application/json Request Body: JSON Copy {
"name": "Updated Name", "icon": "fitness-center", "color": "#2196F3" } Success
Response (200): JSON Copy { "success": true, "data": { "id": "custom-categoryuuid", "name": "Updated Name", "icon": "fitness-center", "color": "#2196F3",
"updatedAt": "2024-03-15T11:00:00Z" } } 10.4 Delete Category Used in: (Delete
custom category) http Copy DELETE /api/v1/categories/{categoryId}
Authorization: Bearer {token} Success Response (200): JSON Copy { "success":
true, "message": "Category deleted successfully" }
3/15/26, 7:29 AM
Generated with https://kome.ai