-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 16, 2026 at 08:17 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `webauth`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

CREATE TABLE `attendances` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` enum('checkin','checkout') NOT NULL,
  `date` date NOT NULL,
  `time` datetime NOT NULL,
  `fingerprint_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendances`
--

INSERT INTO `attendances` (`id`, `user_id`, `type`, `date`, `time`, `fingerprint_id`) VALUES
('803e29fb-632d-4335-b002-4a341ea0de9b', '56ffd528-8b63-4f77-9eb1-53d421153cf1', 'checkout', '2026-09-16', '2026-09-16 12:50:46', 'ae1cd246cf4e8413806baeedf8ef65bf'),
('85ed1471-04a9-48e7-8a34-44fb60b975d8', '5ce1de10-042d-42a2-9b2c-0666277e1881', 'checkin', '2026-09-16', '2026-09-16 12:37:10', 'ae1cd246cf4e8413806baeedf8ef65bf'),
('86ea4e3e-1481-40e6-b162-8f99ecc6bee3', '5ce1de10-042d-42a2-9b2c-0666277e1881', 'checkout', '2026-09-16', '2026-09-16 12:37:23', 'ae1cd246cf4e8413806baeedf8ef65bf'),
('905a1b77-7eea-4754-99ad-aad23aecbf0f', 'a3151f10-a196-431d-bdd1-826febb09c73', 'checkin', '2026-09-16', '2026-09-16 12:20:53', 'ae1cd246cf4e8413806baeedf8ef65bf'),
('97a4f137-cb41-4b8c-99ad-621577ee0a9d', '56ffd528-8b63-4f77-9eb1-53d421153cf1', 'checkin', '2026-09-16', '2026-09-16 12:50:27', 'ae1cd246cf4e8413806baeedf8ef65bf'),
('f6541bfb-e58d-4686-930b-9c76ad8acc04', 'a3151f10-a196-431d-bdd1-826febb09c73', 'checkout', '2026-09-16', '2026-09-16 12:21:39', 'ae1cd246cf4e8413806baeedf8ef65bf');

-- --------------------------------------------------------

--
-- Table structure for table `passkeys`
--

CREATE TABLE `passkeys` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `credential_id` text NOT NULL,
  `credential_public_key` longtext NOT NULL,
  `counter` int(11) DEFAULT 0,
  `device_type` varchar(50) DEFAULT NULL,
  `backed_up` tinyint(1) DEFAULT 0,
  `transports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`transports`)),
  `fingerprint_id` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `last_used` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `passkeys`
--

INSERT INTO `passkeys` (`id`, `user_id`, `credential_id`, `credential_public_key`, `counter`, `device_type`, `backed_up`, `transports`, `fingerprint_id`, `created_at`, `last_used`) VALUES
('08e78615-7f93-4e70-9f36-0379240bddda', 'a3151f10-a196-431d-bdd1-826febb09c73', 'C-99yIY7IFGxDmuIJ2s5IEM6nwU', 'pQECAyYgASFYICCqBYm1Zx5A3PZwOHJb3PhV/DX9gJp7+XM6n2WNd3mIIlggpZTfMAULTDZzb6p0FJVLt34auXe0I8TAcFA388riYP4=', 0, 'multiDevice', 1, '[\"internal\",\"hybrid\"]', 'ae1cd246cf4e8413806baeedf8ef65bf', '2026-09-16 12:20:17', '2026-09-16 12:21:39'),
('1b4da816-3703-4be1-a359-486b53f6be81', '56ffd528-8b63-4f77-9eb1-53d421153cf1', 'NznIn5T9RZWV-5pyOoJCYg9QsKI', 'pQECAyYgASFYIDXMNS9nIupQmkvHPiYR6OQVsjViVWkACULnhzbPlBV9IlggOUD7BFyKdqGgJrZ/wl8eDl76hCW4wvFsaUL1A5J+yms=', 0, 'multiDevice', 1, '[\"internal\",\"hybrid\"]', 'ae1cd246cf4e8413806baeedf8ef65bf', '2026-09-16 12:47:22', '2026-09-16 12:50:46'),
('278d5eb4-ff80-4527-b269-423d7b5bd714', '5ce1de10-042d-42a2-9b2c-0666277e1881', '0NZndrA10QCvdtDzRfn9OzSt8rQ', 'pQECAyYgASFYIIHviRZZRH2ux0qvFPGycK2ld6pV2BUYDPawblGH9RISIlggmRoXgLcYFPPbwRrTA6kw6aKYpfh+vqKu8EVqKJZ5OQc=', 0, 'multiDevice', 1, '[\"internal\",\"hybrid\"]', 'ae1cd246cf4e8413806baeedf8ef65bf', '2026-09-16 12:36:56', '2026-09-16 12:37:23');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `role` enum('admin','employee') DEFAULT 'employee',
  `fingerprint_id` varchar(255) DEFAULT NULL,
  `passkey_reset` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `employee_id`, `name`, `role`, `fingerprint_id`, `passkey_reset`, `created_at`) VALUES
('56ffd528-8b63-4f77-9eb1-53d421153cf1', '2278', 'bintang', 'employee', 'ae1cd246cf4e8413806baeedf8ef65bf', 0, '2026-09-16 12:45:50'),
('5ce1de10-042d-42a2-9b2c-0666277e1881', '23', 'yaya', 'employee', 'ae1cd246cf4e8413806baeedf8ef65bf', 0, '2026-09-16 12:31:16'),
('a3151f10-a196-431d-bdd1-826febb09c73', '222222', 'resky', 'employee', 'ae1cd246cf4e8413806baeedf8ef65bf', 0, '2026-09-16 12:17:01'),
('ae91dce5-e7ab-4185-acbb-b7f53e474309', 'admin', 'Administrator', 'admin', NULL, 0, '2026-09-15 16:00:10');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `passkeys`
--
ALTER TABLE `passkeys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `credential_id` (`credential_id`) USING HASH,
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendances`
--
ALTER TABLE `attendances`
  ADD CONSTRAINT `attendances_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `passkeys`
--
ALTER TABLE `passkeys`
  ADD CONSTRAINT `passkeys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
