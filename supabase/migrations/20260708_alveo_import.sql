-- Alveo historical data import
-- 67 deals from Financement Tracker DCA.xlsx

WITH deal_5 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Lina Amenu Poirier', '2025-09-18', 4000.0, 4599.0, 'Financement', 'Rosalie', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_5), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_5), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_5), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_5), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_5), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_5), 'closer', 3, 133.33, true, now());

WITH deal_6 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Préscillia Paquette', '2025-09-26', 4000.0, 2305.42, 'Financement', 'WEBII', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_6), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_6), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_6), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_6), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_6), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_6), 'closer', 3, 133.33, false, NULL);

WITH deal_7 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Ghislaine Ahoua', '2025-09-27', 4000.0, 4599.0, 'Financement', 'WEBI', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_7), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_7), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_7), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_7), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_7), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_7), 'closer', 3, 133.33, true, now());

WITH deal_10 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Fariyal Habibi Nizamuddin', '2025-11-06', 2947.0, 3399.99, 'Financement', 'Kalianna', 'Samuel', 147.35, 294.7, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_10), 'setter', 1, 49.12, true, now()),
  ((SELECT id FROM deal_10), 'setter', 2, 49.12, true, now()),
  ((SELECT id FROM deal_10), 'setter', 3, 49.12, true, now()),
  ((SELECT id FROM deal_10), 'closer', 1, 98.23, true, now()),
  ((SELECT id FROM deal_10), 'closer', 2, 98.23, true, now()),
  ((SELECT id FROM deal_10), 'closer', 3, 98.23, true, now());

WITH deal_11 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Elizabeth Romero', '2025-11-08', 4000.0, 4599.99, 'Financement', 'Emma', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_11), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_11), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_11), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_11), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_11), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_11), 'closer', 3, 133.33, true, now());

WITH deal_12 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Eva Del Pilar Castillo Franco', '2025-11-13', 2957.16, 3399.99, 'Financement', 'Emma - Webi', 'Samuel', 147.86, 295.72, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_12), 'setter', 1, 49.29, true, now()),
  ((SELECT id FROM deal_12), 'setter', 2, 49.29, true, now()),
  ((SELECT id FROM deal_12), 'setter', 3, 49.29, true, now()),
  ((SELECT id FROM deal_12), 'closer', 1, 98.57, true, now()),
  ((SELECT id FROM deal_12), 'closer', 2, 98.57, true, now()),
  ((SELECT id FROM deal_12), 'closer', 3, 98.57, true, now());

WITH deal_13 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Providence Mozoba', '2025-11-12', 4000.0, 4599.02, 'Financement', 'Emma - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_13), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_13), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_13), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_13), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_13), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_13), 'closer', 3, 133.33, true, now());

WITH deal_14 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Gabrielle Roussel', '2025-11-17', 4000.0, 4599.04, 'Financement', 'Kalianna - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_14), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_14), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_14), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_14), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_14), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_14), 'closer', 3, 133.33, true, now());

WITH deal_15 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Yvette ISHIMWE', '2025-11-19', 4000.0, 4598.66, 'Financement', 'Emma - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_15), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_15), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_15), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_15), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_15), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_15), 'closer', 3, 133.33, true, now());

WITH deal_16 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Bryzeida Segovia', '2025-11-21', 4000.0, 4599.02, 'Financement', 'Kalianna - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_16), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_16), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_16), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_16), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_16), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_16), 'closer', 3, 133.33, true, now());

WITH deal_17 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Élisabeth Turgeon', '2025-11-23', 4000.0, 2378.12, 'Financement', 'Emma - Webi', 'Amy Lachance', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_17), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_17), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_17), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_17), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_17), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_17), 'closer', 3, 133.33, true, now());

WITH deal_18 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Mbayna Djiba', '2025-11-23', 4000.0, 4599.02, 'Financement', 'Emma - Webi', 'Rosalie', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_18), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_18), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_18), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_18), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_18), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_18), 'closer', 3, 133.33, true, now());

WITH deal_19 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Lily Rose Joly', '2025-11-23', 4000.0, 4599.02, 'Financement', 'Kalianna - Webi', 'Amy Lachance', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_19), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_19), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_19), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_19), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_19), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_19), 'closer', 3, 133.33, true, now());

WITH deal_20 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Natacha Petiquay Michaud', '2025-11-28', 4000.0, 0.0, 'Financement', 'Kalianna - Webi', 'Samuel', 200.0, 400.0, 'annulé')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_20), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_20), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_20), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_20), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_20), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_20), 'closer', 3, 133.33, false, NULL);

WITH deal_21 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Sabrina Preval Gentile', '2025-11-29', 4000.0, 4599.0, 'Financement', 'Emma - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_21), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_21), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_21), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_21), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_21), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_21), 'closer', 3, 133.33, true, now());

WITH deal_26 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Laurence Perrault', NULL, 4000.0, 4599.0, 'Financement', 'Kalianna - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_26), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_26), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_26), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_26), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_26), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_26), 'closer', 3, 133.33, true, now());

WITH deal_27 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Anastassia Belen Azocar Matus', NULL, 4000.0, 4599.03, 'Financement', 'Kalianna - Webi', 'Amy Lachance', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_27), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_27), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_27), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_27), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_27), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_27), 'closer', 3, 133.33, true, now());

WITH deal_28 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Alexandra Proulx', NULL, 4000.0, 4599.03, 'Financement', 'Emma- Webi', 'Amy Lachance', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_28), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_28), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_28), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_28), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_28), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_28), 'closer', 3, 133.33, true, now());

WITH deal_29 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Kristina Bellavance', NULL, 4000.0, 4599.03, 'Financement', 'Kalianna - Webi', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_29), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_29), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_29), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_29), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_29), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_29), 'closer', 3, 133.33, true, now());

WITH deal_30 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Marie Luiny Torchon', NULL, 1825.61, 2008.35, 'Financement', 'Emma- Webi', 'Jacinthe', 91.28, 182.56, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_30), 'setter', 1, 30.43, true, now()),
  ((SELECT id FROM deal_30), 'setter', 2, 30.43, true, now()),
  ((SELECT id FROM deal_30), 'setter', 3, 30.43, true, now()),
  ((SELECT id FROM deal_30), 'closer', 1, 60.85, true, now()),
  ((SELECT id FROM deal_30), 'closer', 2, 60.85, true, now()),
  ((SELECT id FROM deal_30), 'closer', 3, 60.85, true, now());

WITH deal_34 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Jessica Savoie', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_34), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_34), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_34), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_34), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_34), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_34), 'closer', 3, 133.33, false, NULL);

WITH deal_35 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Ashley Constanza', NULL, 4000.0, 4599.03, 'Financement', 'Kalianna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_35), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_35), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_35), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_35), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_35), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_35), 'closer', 3, 133.33, false, NULL);

WITH deal_36 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Karolane Aubé-Chagnon', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_36), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_36), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_36), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_36), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_36), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_36), 'closer', 3, 133.33, false, NULL);

WITH deal_37 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Sarah Aissani', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_37), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_37), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_37), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_37), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_37), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_37), 'closer', 3, 133.33, false, NULL);

WITH deal_38 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Marie-Joelle Plante', NULL, 2260.5, 2210.0, 'Financement', 'Kalianna', 'Samuel', 113.03, 226.05, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_38), 'setter', 1, 37.68, true, now()),
  ((SELECT id FROM deal_38), 'setter', 2, 37.68, true, now()),
  ((SELECT id FROM deal_38), 'setter', 3, 37.68, false, NULL),
  ((SELECT id FROM deal_38), 'closer', 1, 75.35, true, now()),
  ((SELECT id FROM deal_38), 'closer', 2, 75.35, true, now()),
  ((SELECT id FROM deal_38), 'closer', 3, 75.35, false, NULL);

WITH deal_39 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Camille Ippersiel', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_39), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_39), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_39), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_39), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_39), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_39), 'closer', 3, 133.33, true, now());

WITH deal_40 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Melody Garceau', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_40), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_40), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_40), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_40), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_40), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_40), 'closer', 3, 133.33, false, NULL);

WITH deal_41 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Faravena Olivier', NULL, 4000.0, 4599.03, 'Financement', 'Kalianna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_41), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_41), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_41), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_41), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_41), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_41), 'closer', 3, 133.33, false, NULL);

WITH deal_42 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Doungbissi Riovanna', NULL, 4000.0, 4599.03, 'Financement', 'Kalianna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_42), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_42), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_42), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_42), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_42), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_42), 'closer', 3, 133.33, false, NULL);

WITH deal_43 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Fidèle Aka', NULL, 4000.0, 4599.03, 'Financement', 'Emma', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_43), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_43), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_43), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_43), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_43), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_43), 'closer', 3, 133.33, false, NULL);

WITH deal_44 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Ashley Dare', NULL, 4000.0, 4599.03, 'Financement', 'Kim', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_44), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_44), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_44), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_44), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_44), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_44), 'closer', 3, 133.33, false, NULL);

WITH deal_52 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Cloé Sirois', NULL, 4000.0, 4599.0, 'Financement', 'Kim', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_52), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_52), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_52), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_52), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_52), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_52), 'closer', 3, 133.33, true, now());

WITH deal_53 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Tamara Galante', NULL, 4000.0, 0.0, 'Financement', 'Danna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_53), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_53), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_53), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_53), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_53), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_53), 'closer', 3, 133.33, false, NULL);

WITH deal_54 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Maika Jourdenais', NULL, 4000.0, 4599.0, 'Financement', 'Kim', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_54), 'setter', 1, 66.67, true, now()),
  ((SELECT id FROM deal_54), 'setter', 2, 66.67, true, now()),
  ((SELECT id FROM deal_54), 'setter', 3, 66.67, true, now()),
  ((SELECT id FROM deal_54), 'closer', 1, 133.33, true, now()),
  ((SELECT id FROM deal_54), 'closer', 2, 133.33, true, now()),
  ((SELECT id FROM deal_54), 'closer', 3, 133.33, true, now());

WITH deal_57 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Amélie Cloutier', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_57), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_57), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_57), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_57), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_57), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_57), 'closer', 3, 133.33, false, NULL);

WITH deal_58 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Ayanha Lepage', NULL, 3130.25, 869.75, 'Interac', 'Kim', 'Emma', 156.51, 313.03, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_58), 'setter', 1, 52.17, false, NULL),
  ((SELECT id FROM deal_58), 'setter', 2, 52.17, false, NULL),
  ((SELECT id FROM deal_58), 'setter', 3, 52.17, false, NULL),
  ((SELECT id FROM deal_58), 'closer', 1, 104.34, false, NULL),
  ((SELECT id FROM deal_58), 'closer', 2, 104.34, false, NULL),
  ((SELECT id FROM deal_58), 'closer', 3, 104.34, false, NULL);

WITH deal_59 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Samantha-Lee Gervais Plante', NULL, 2912.81, 1087.19, 'Interac', 'Kalianna', 'Samuel', 145.64, 291.28, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_59), 'setter', 1, 48.55, false, NULL),
  ((SELECT id FROM deal_59), 'setter', 2, 48.55, false, NULL),
  ((SELECT id FROM deal_59), 'setter', 3, 48.55, false, NULL),
  ((SELECT id FROM deal_59), 'closer', 1, 97.09, true, now()),
  ((SELECT id FROM deal_59), 'closer', 2, 97.09, false, NULL),
  ((SELECT id FROM deal_59), 'closer', 3, 97.09, false, NULL);

WITH deal_60 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Angy Clenor', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_60), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_60), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_60), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_60), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_60), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_60), 'closer', 3, 133.33, false, NULL);

WITH deal_62 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Raphaëlle Renaud', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_62), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_62), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_62), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_62), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_62), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_62), 'closer', 3, 133.33, false, NULL);

WITH deal_63 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Charlotte Vigeant', NULL, 4000.0, 0.0, 'Financement', 'Rosalie', 'Alliyah', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_63), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_63), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_63), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_63), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_63), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_63), 'closer', 3, 133.33, false, NULL);

WITH deal_67 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Kim Goupil', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_67), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_67), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_67), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_67), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_67), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_67), 'closer', 3, 133.33, false, NULL);

WITH deal_70 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Anabella Hamel', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_70), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_70), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_70), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_70), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_70), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_70), 'closer', 3, 133.33, false, NULL);

WITH deal_71 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Clairefée Andréma Castro Clairvoyant', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_71), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_71), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_71), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_71), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_71), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_71), 'closer', 3, 133.33, false, NULL);

WITH deal_72 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Sandrine Melancon', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Samuel', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_72), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_72), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_72), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_72), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_72), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_72), 'closer', 3, 133.33, false, NULL);

WITH deal_73 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Lenina Guertin', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_73), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_73), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_73), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_73), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_73), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_73), 'closer', 3, 133.33, false, NULL);

WITH deal_74 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Vanessa Couture', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_74), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_74), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_74), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_74), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_74), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_74), 'closer', 3, 133.33, false, NULL);

WITH deal_75 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Priscilla Bestial', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_75), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_75), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_75), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_75), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_75), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_75), 'closer', 3, 133.33, false, NULL);

WITH deal_76 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Amanda Lavallée', NULL, 3150.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 157.5, 315.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_76), 'setter', 1, 52.5, false, NULL),
  ((SELECT id FROM deal_76), 'setter', 2, 52.5, false, NULL),
  ((SELECT id FROM deal_76), 'setter', 3, 52.5, false, NULL),
  ((SELECT id FROM deal_76), 'closer', 1, 105.0, false, NULL),
  ((SELECT id FROM deal_76), 'closer', 2, 105.0, false, NULL),
  ((SELECT id FROM deal_76), 'closer', 3, 105.0, false, NULL);

WITH deal_77 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Marjorie Dufresne', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_77), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_77), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_77), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_77), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_77), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_77), 'closer', 3, 133.33, false, NULL);

WITH deal_78 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Aya Azizi', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_78), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_78), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_78), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_78), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_78), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_78), 'closer', 3, 133.33, false, NULL);

WITH deal_79 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Khayla Chartier', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_79), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_79), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_79), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_79), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_79), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_79), 'closer', 3, 133.33, false, NULL);

WITH deal_80 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Kelly Desrosiers', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_80), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_80), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_80), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_80), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_80), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_80), 'closer', 3, 133.33, false, NULL);

WITH deal_81 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Karen Ng Foong Lin', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_81), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_81), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_81), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_81), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_81), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_81), 'closer', 3, 133.33, false, NULL);

WITH deal_84 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Felicity Amoah', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Jacinthe', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_84), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_84), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_84), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_84), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_84), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_84), 'closer', 3, 133.33, false, NULL);

WITH deal_85 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Chahineze', NULL, 4000.0, 0.0, 'Financement', 'Mélika', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_85), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_85), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_85), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_85), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_85), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_85), 'closer', 3, 133.33, false, NULL);

WITH deal_86 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Rose Zeagman', NULL, 4000.0, 0.0, 'Financement', 'Mélika', 'Jacinthe', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_86), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_86), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_86), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_86), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_86), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_86), 'closer', 3, 133.33, false, NULL);

WITH deal_87 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Elsa Miklosic', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_87), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_87), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_87), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_87), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_87), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_87), 'closer', 3, 133.33, false, NULL);

WITH deal_88 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Daphne Berthiaume', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Emma', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_88), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_88), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_88), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_88), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_88), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_88), 'closer', 3, 133.33, false, NULL);

WITH deal_89 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Claudia Habib', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_89), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_89), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_89), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_89), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_89), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_89), 'closer', 3, 133.33, false, NULL);

WITH deal_90 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Sabrina Ireland', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_90), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_90), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_90), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_90), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_90), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_90), 'closer', 3, 133.33, false, NULL);

WITH deal_91 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Jessica St-Pierre', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Audrey', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_91), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_91), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_91), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_91), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_91), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_91), 'closer', 3, 133.33, false, NULL);

WITH deal_92 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Christiane Vallée', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_92), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_92), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_92), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_92), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_92), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_92), 'closer', 3, 133.33, false, NULL);

WITH deal_93 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Noémie Trempe', NULL, 4000.0, 0.0, 'Financement', 'Rose', 'Audrey', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_93), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_93), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_93), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_93), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_93), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_93), 'closer', 3, 133.33, false, NULL);

WITH deal_96 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Tania Levesque', NULL, 4000.0, 0.0, 'Financement', 'Kim', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_96), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_96), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_96), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_96), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_96), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_96), 'closer', 3, 133.33, false, NULL);

WITH deal_97 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Joanie Simard', NULL, 4000.0, 0.0, 'Financement', 'Mélika', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_97), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_97), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_97), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_97), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_97), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_97), 'closer', 3, 133.33, false, NULL);

WITH deal_98 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Annaelle Fiette', NULL, 4000.0, 0.0, 'Financement', 'Mélika', 'Shanny', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_98), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_98), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_98), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_98), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_98), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_98), 'closer', 3, 133.33, false, NULL);

WITH deal_99 AS (
  INSERT INTO alveo_deals (client_name, deal_date, montant, collected, methode, setter_name, closer_name, commission_setter, commission_closer, statut)
  VALUES ('Laurence Jauvin', NULL, 4000.0, 0.0, 'Financement', 'Kalianna', 'Audrey', 200.0, 400.0, 'actif')
  RETURNING id
)
INSERT INTO alveo_payments (deal_id, person_role, mois, amount, paid, paid_at) VALUES
  ((SELECT id FROM deal_99), 'setter', 1, 66.67, false, NULL),
  ((SELECT id FROM deal_99), 'setter', 2, 66.67, false, NULL),
  ((SELECT id FROM deal_99), 'setter', 3, 66.67, false, NULL),
  ((SELECT id FROM deal_99), 'closer', 1, 133.33, false, NULL),
  ((SELECT id FROM deal_99), 'closer', 2, 133.33, false, NULL),
  ((SELECT id FROM deal_99), 'closer', 3, 133.33, false, NULL);

